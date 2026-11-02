"""Local OpenAI-compatible choice scorer. CPU smoke uses a real tiny open LM.

Normalized conditional sequence likelihoods over caller options are scores,
not certified probabilities of clinical correctness. No remote inference calls.
"""
import argparse
import json
import os
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', default='HuggingFaceTB/SmolLM2-135M-Instruct')
    parser.add_argument('--revision', default='12fd25f77366fa6b3b4b768ec3050bf629380bac')
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--device', choices=['auto', 'cpu', 'cuda'], default='auto')
    parser.add_argument('--tabpfn-training', type=Path)
    args = parser.parse_args()
    import torch
    from fastapi import FastAPI, HTTPException
    import uvicorn
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from huggingface_hub import model_info
    torch.set_num_threads(2)
    info = model_info(args.model, revision=args.revision)
    license_id = (info.card_data or {}).get('license')
    if license_id not in ('apache-2.0', 'mit'):
        raise ValueError(f'Unapproved model license: {license_id}; review before use')
    tokenizer = AutoTokenizer.from_pretrained(args.model, revision=args.revision, trust_remote_code=False)
    device = 'cuda' if args.device == 'cuda' or (args.device == 'auto' and torch.cuda.is_available()) else 'cpu'
    model = AutoModelForCausalLM.from_pretrained(args.model, revision=args.revision, trust_remote_code=False).to(device).eval()
    tab_models = {}
    training = []
    if args.tabpfn_training:
        from tabpfn import TabPFNClassifier
        from tabpfn.constants import ModelVersion
        training = json.loads(args.tabpfn_training.read_text())
        if not training or any(r.get('split') != 'train' for r in training):
            raise ValueError('TabPFN accepts train-only rows, never calibration/test rows')
        for target in ('pass', 'improvement'):
            if len(set(r[target] for r in training)) < 2:
                raise ValueError(f'Insufficient class diversity for {target}')
            classifier = TabPFNClassifier.create_default_for_version(ModelVersion.V2, device='cpu', n_estimators=2)
            classifier.fit([r['features'] for r in training], [r[target] for r in training])
            tab_models[target] = classifier
    app = FastAPI()

    @app.get('/health')
    def health():
        return {'model': args.model, 'revision': info.sha, 'license': license_id, 'device': device,
                'tabpfn': list(tab_models), 'training_rows': len(training)}

    @app.post('/v1/chat/completions')
    def completion(body: dict):
        options = body.get('decision_options')
        if not isinstance(options, list) or not 1 <= len(options) <= 10 or len(set(options)) != len(options):
            raise HTTPException(400, 'Supply 1–10 distinct decision_options')
        prompt = tokenizer.apply_chat_template(body['messages'], tokenize=False, add_generation_prompt=True)
        prefix = tokenizer(prompt, return_tensors='pt', truncation=True, max_length=1024)['input_ids'].to(device)
        scores = []
        with torch.inference_mode():
            for option in options:
                suffix = tokenizer(str(option), add_special_tokens=False, return_tensors='pt')['input_ids'].to(device)
                tokens = torch.cat((prefix, suffix), dim=1)
                logits = model(tokens).logits[:, prefix.shape[1]-1:-1, :]
                score = logits.log_softmax(-1).gather(-1, suffix.unsqueeze(-1)).sum().item()
                scores.append(score)
        weights = torch.tensor(scores).softmax(0).tolist()
        winner = options[max(range(len(weights)), key=weights.__getitem__)]
        return {'model': args.model, 'choices': [{'index': 0, 'message': {'role': 'assistant', 'content': winner}, 'finish_reason': 'stop'}],
                'decision_probabilities': dict(zip(options, weights)), 'abstain': False,
                'scoring': 'softmax of summed conditional option-token log likelihoods'}

    @app.post('/screen')
    def screen(body: dict):
        if not tab_models:
            raise HTTPException(503, 'TabPFN not fitted; provide --tabpfn-training')
        try:
            result = {}
            for target, clf in tab_models.items():
                index = list(clf.classes_).index(1)
                result[target] = float(clf.predict_proba([body['features']])[0, index])
            return result
        except (ValueError, KeyError) as error:
            raise HTTPException(400, str(error)) from error

    uvicorn.run(app, host='127.0.0.1', port=args.port, workers=1)


if __name__ == '__main__':
    main()
