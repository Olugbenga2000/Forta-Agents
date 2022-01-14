import {
  HandleBlock,
} from "forta-agent";
import { providerHandleBlock } from "./agent";
import { createAddress, encodeParameter, TestBlockEvent } from "forta-agent-tools";
import { when, resetAllWhenMocks } from "jest-when";
import { isCallToBalance, isCallToAvailable, isCallToProductionVaults, isCallToDevelopmentVaults } from "./mock.utils";
import { createFinding } from "./utils";

const THRESHOLD = "";

const developmentVaults = [
  createAddress("0x1"),
  createAddress("0x2"),
];

const productionVaults = [
  createAddress("0x3"),
  createAddress("0x4"),
];

const allVaults = developmentVaults.concat(productionVaults);

const mockCall = jest.fn();

const ethersMock = {
  call: mockCall,
  _isProvider: true // Necessary for being a valid provider
} as any;

const pickleFinanceRegistry = createAddress("0x0");

describe("PickleFinance - IdleFunds Test Suite", () => {
  let handleBlock: HandleBlock;

  beforeAll(() => {
    handleBlock = providerHandleBlock(pickleFinanceRegistry, ethersMock);
  });

  beforeEach(() => {
    resetAllWhenMocks();
    when(mockCall).calledWith(isCallToDevelopmentVaults, expect.anything()).mockReturnValue(encodeParameter("address[]", developmentVaults));
    when(mockCall).calledWith(isCallToProductionVaults, expect.anything()).mockReturnValue(encodeParameter("address[]", productionVaults));
  });

  it("should return empty findings if idle funds in pickle jar are below threshold", async () => {
    const blockEvent = new TestBlockEvent(); 
    const balancesAndAvailables = [["100", "17"], ["100", "5"], ["1000", "128"], ["1000", "249"]];

    for (let i = 0; i < allVaults.length; i++) {
      const [balance, available] = balancesAndAvailables[i];
      when(mockCall).calledWith(isCallToBalance(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", balance));
      when(mockCall).calledWith(isCallToAvailable(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", available));
    }

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
  });

  it("should return a finding if idle funds in a pickle jar are above threshold", async () => {
    const blockEvent = new TestBlockEvent(); 
    const balancesAndAvailables = [["100", "26"], ["100", "5"], ["1000", "128"], ["1000", "249"]];

    for (let i = 0; i < allVaults.length; i++) {
      const [balance, available] = balancesAndAvailables[i];
      when(mockCall).calledWith(isCallToBalance(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", balance));
      when(mockCall).calledWith(isCallToAvailable(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", available));
    }

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([ createFinding(allVaults[0], "26")]);
  });

  it("should return a finding for each piclke jar where idle funds are above threshold", async () => {
    const blockEvent = new TestBlockEvent(); 
    const balancesAndAvailables = [["100", "24"], ["100", "32"], ["1000", "800"], ["1000", "249"]];

    for (let i = 0; i < allVaults.length; i++) {
      const [balance, available] = balancesAndAvailables[i];
      when(mockCall).calledWith(isCallToBalance(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", balance));
      when(mockCall).calledWith(isCallToAvailable(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", available));
    }

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([ createFinding(allVaults[1], "32"), createFinding(allVaults[2], "80") ]);
  });

  it("should not check idle funds on not pickle jars", async () => {
    const blockEvent = new TestBlockEvent(); 
    const balancesAndAvailables = [["100", "24"], ["100", "12"], ["1000", "100"], ["1000", "249"]];

    for (let i = 0; i < allVaults.length; i++) {
      const [balance, available] = balancesAndAvailables[i];
      when(mockCall).calledWith(isCallToBalance(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", balance));
      when(mockCall).calledWith(isCallToAvailable(allVaults[i]), expect.anything()).mockReturnValue(encodeParameter("uint256", available));
    }

    // bad values in not a jar account
    when(mockCall).calledWith(isCallToBalance(createAddress("0x5")), expect.anything()).mockReturnValue(encodeParameter("uint256", "100"));
    when(mockCall).calledWith(isCallToAvailable(createAddress("0x5")), expect.anything()).mockReturnValue(encodeParameter("uint256", "80"));

    const findings = await handleBlock(blockEvent);

    expect(findings).toStrictEqual([]);
  });
});
