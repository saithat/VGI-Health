export interface Interp {
  screenCanonical?(screenJson: string): string;
  /** Layout/keyboard JSON API, with no host interpretation. */
  layout?(request: string): string;
  layoutRender?(
    spec: string,
    program: string,
    facts: string,
    user: string,
    state: string,
    options: { viewport: { w: number; h: number }; references?: unknown },
  ): string;
  init(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
  ): string;
  step(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
    eventJson: string,
  ): string;
  view(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
  ): string;
  render(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
  ): string;
  /** Semantic §10 UI. Optional until ehr_render_ui is present in the loaded artifact. */
  renderUi?(
    specJson: string,
    programJson: string,
    factsOrBundleJson: string,
    userJson: string,
    stateJson: string,
  ): string;
  facts(bundleJson: string): string;
}
