import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";

it("offers night search, persists it, restores resume/replay choices and submits it", async () => {
  document.documentElement.innerHTML = readFileSync("src/dashboard/start/index.html", "utf8");
  localStorage.clear();
  const launched: unknown[] = [];
  class Request {
    url = "";
    status = 200;
    response: unknown;
    onload?: () => void;
    open(_method: string, url: string) { this.url = url; }
    setRequestHeader() {}
    send(body?: string) {
      if (this.url.endsWith("/options")) this.response = {
        worlds:[{id:"2",days:2}],
        runs:["climbing","legacy"].map(id => ({id,backend:"codex",days:2,personas:["P2","P4"],
          screens:"lean",model:"",world:"2",nightSearch:id === "climbing" ? "climb" : "first"})),
      };
      else if (this.url.endsWith("/status")) this.response = {csrf:"token",stack:{state:"unavailable",message:"Offline test"},recording:null};
      else if (this.url.endsWith("/launch")) {
        launched.push(JSON.parse(body ?? "{}"));
        this.response = {recording:null};
      } else this.response = [];
      this.onload?.();
    }
  }
  const source = readFileSync("src/dashboard/start/page.js","utf8");
  new Function("document","location","localStorage","XMLHttpRequest","setTimeout","addEventListener",source)(
    document,{hash:"#record"},localStorage,Request,()=>0,()=>{},
  );
  const select = document.querySelector('select[name="nightSearch"]');
  const launch = document.getElementById("launch");
  if (!(select instanceof HTMLSelectElement) || !(launch instanceof HTMLButtonElement)) throw Error("Missing night search controls");
  await vi.waitFor(()=>expect(launch.disabled).toBe(false));
  expect(select.closest("label")?.textContent).toContain("Night search");
  expect([...select.options].map(option=>[option.value,option.textContent])).toEqual([
    ["first","Stop at first improvement"],["climb","Keep climbing"],
  ]);
  expect(select.value).toBe("first");
  select.value = "climb";
  select.dispatchEvent(new Event("change",{bubbles:true}));
  expect(JSON.parse(localStorage.getItem("vgi.start.record") ?? "{}").nightSearch).toBe("climb");
  const form = document.getElementById("record-form");
  if (!(form instanceof HTMLFormElement)) throw Error("Missing recording form");
  form.dispatchEvent(new Event("submit",{cancelable:true}));
  await vi.waitFor(()=>expect(launched).toMatchObject([{nightSearch:"climb"}]));
  for (const control of [document.getElementById("resume-run"),document.querySelector('select[name="replayFrom"]')]) {
    if (!(control instanceof HTMLSelectElement)) throw Error("Missing recorded run selector");
    for (const [id,search] of [["legacy","first"],["climbing","climb"]]) {
      control.value = id ?? "";
      control.dispatchEvent(new Event("change",{bubbles:true}));
      expect(select.value).toBe(search);
    }
  }
});
