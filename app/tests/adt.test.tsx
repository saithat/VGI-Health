import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { AdtApp } from '../src/AdtApp';
import { boardSchema, readBoard, sendAdt } from '../src/data/adtService';
import { MarRejected } from '../src/data/commitService';
vi.mock('../src/data/commitService', async original => ({
  ...(await original<typeof import('../src/data/commitService')>()),
  restoreMar: vi.fn(async () => ({user:{id:'manager',role:'bedManager'}})),
}));
vi.mock('../src/data/adtService', async original => ({
  ...(await original<typeof import('../src/data/adtService')>()),
  readBoard:vi.fn(), sendAdt:vi.fn(), subscribeBoard:vi.fn(() => vi.fn()),
}));
const initial = () => boardSchema.parse({state:{
  patients:[{id:'a',admitted:true,bed:401,revision:7,encounter:1,last:{kind:'transfer',source:403,target:401}},
    {id:'b',admitted:true,bed:402}],
  beds:[{id:401,unit:'west',phase:'occupied',occupant:'a'},{id:402,unit:'west',phase:'occupied',occupant:'b'},
    {id:403,unit:'west',phase:'ready',occupant:null}],
},versions:[{key:'bed:401',version:3},{key:'bed:402',version:2},{key:'bed:403',version:4},{key:'patient:a',version:8},{key:'patient:b',version:2}],
roles:['bedManager'],cursor:'current'});
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation(() => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
});
beforeEach(() => {vi.clearAllMocks();vi.mocked(readBoard).mockResolvedValue(initial());vi.mocked(sendAdt).mockResolvedValue({outcome:'persisted'});});
afterEach(cleanup);
const paint = async () => {
  render(<MantineProvider><AdtApp /></MantineProvider>);
  await screen.findByRole('heading',{name:'Bed board'});
};
it('submits one A17 command with both patients/beds and preserves the identical intent after an uncertain outcome',async () => {
  await paint();
  fireEvent.change(screen.getByLabelText('Action'),{target:{value:'swap'}});
  fireEvent.change(screen.getByLabelText('Other patient'),{target:{value:'b'}});
  vi.mocked(sendAdt).mockRejectedValueOnce(new Error('lost response'));
  fireEvent.click(screen.getByRole('button',{name:'Swap beds (A17)'}));
  await screen.findByText(/Outcome unknown/);
  const first = vi.mocked(sendAdt).mock.calls[0]?.[0];
  expect(first).toMatchObject({action:'swap',patient:'a',other:'b',source:401,bed:402,expected:initial().versions});
  expect(screen.getByRole('button',{name:'Swap beds (A17)'}).closest('fieldset')?.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Reconcile command'}));
  await screen.findByText('Swap beds (A17) saved.');
  expect(vi.mocked(sendAdt).mock.calls[1]?.[0]).toEqual(first);
});
it('cancels the displayed original event and explains a destination/origin refusal',async () => {
  await paint();fireEvent.change(screen.getByLabelText('Action'),{target:{value:'cancelTransfer'}});
  expect(screen.getByText(/Original event: a:7/).textContent).toContain('Origin bed: 403');
  vi.mocked(sendAdt).mockRejectedValueOnce(new MarRejected('adt_cancel_transfer_requires_current_destination_and_ready_origin'));
  fireEvent.click(screen.getByRole('button',{name:'Cancel transfer (A12)'}));
  await screen.findByText(/original bed to be empty and ready after cleaning/);
  expect(vi.mocked(sendAdt).mock.calls[0]?.[0]).toMatchObject({action:'cancelTransfer',event:7,patient:'a'});
  expect(vi.mocked(sendAdt).mock.calls[0]?.[0]).not.toHaveProperty('bed');
  await waitFor(() => expect(readBoard).toHaveBeenCalledTimes(2));
});
it('A13 explicitly chooses a ready bed and A11 refuses a later event in the UI',async () => {
  const board = initial();board.state.patients[0] = {id:'a',admitted:false,bed:null,revision:9,encounter:1,last:{kind:'discharge',source:401,target:null}};
  vi.mocked(readBoard).mockResolvedValue(board);
  await paint();fireEvent.change(screen.getByLabelText('Action'),{target:{value:'cancelAdmit'}});
  fireEvent.click(screen.getByRole('button',{name:'Cancel admission (A11)'}));
  await screen.findByText(/latest matching ADT event/);expect(sendAdt).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Action'),{target:{value:'cancelDischarge'}});
  fireEvent.change(screen.getByLabelText('Bed'),{target:{value:'403'}});
  fireEvent.click(screen.getByRole('button',{name:'Cancel discharge (A13)'}));
  await screen.findByText('Cancel discharge (A13) saved.');
  expect(vi.mocked(sendAdt).mock.calls[0]?.[0]).toMatchObject({action:'cancelDischarge',event:9,patient:'a',bed:403});
});
