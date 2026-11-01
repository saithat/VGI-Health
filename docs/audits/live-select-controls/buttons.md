# Button audit

Generated 2026-11-01T17:43:59.622Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 0 | 0 | 0 | 0 |
| App final | 0 | 0 | 0 | 0 |
| Lean final | 45 | 0 | 0 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|0\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Fahey, Andrew (MRN 67424011) | workspace.open\|5b5b7681-19bd-401d-a6e6-e36f5e1eeec6\|8\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: O'Keefe, Dylan Casey (MRN 94585295) | workspace.open\|6acc67c1-10ee-40d0-a039-f89ab1edb72b\|15\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Towne, Trinidad (MRN 37888344) | workspace.open\|71b358bb-643e-4264-9943-0540682900b5\|0\|edTrackBoard | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|52\|edTrackBoard | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Rogahn, Anisha Lavelle (MRN 12426178) | workspace.open\|62182a24-63f4-4026-9243-f77478d9ee9e\|103\|edTrackBoard | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|80\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Veum, Allyson Leonila (MRN 46013516) | workspace.open\|d159d2f2-b046-4b53-998b-989862f35812\|159\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Denesik, Edwardo Pablo (MRN 27834798) | workspace.open\|b249cda6-abaf-4706-9107-c9141d554ea5\|0\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Pfeffer, Thanh Michael (MRN 36792169) | workspace.open\|80b7272b-1686-4773-8535-162b27e9f8c2\|9\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Lehner, Zachariah Dylan (MRN 14483567) | workspace.open\|4caea025-0a31-4289-a339-d3996b506e3b\|17\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Mitchell, Destiny Wendolyn (MRN 38529840) | workspace.open\|edf07476-05b3-4fff-8e03-a95af2f67f69\|0\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Grimes, Yuette Bethany (MRN 52168180) | workspace.open\|dc903e54-fa8f-4cb5-aca8-dfc730fefe18\|4\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Eichmann, Teresita Soledad (MRN 74920675) | workspace.open\|7c9c111d-59b7-493a-a0cd-ad267ab9265f\|8\|orSchedule | click / lean | works | Lean state changed; result "ok" |
