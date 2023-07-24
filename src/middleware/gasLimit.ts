import { BigNumberish, BigNumber, BytesLike, ethers } from "ethers";
import { OpToJSON } from "userop/dist/utils";
import { UserOperationMiddlewareFn } from "userop/dist/types";

interface GasEstimate {
  preVerificationGas: BigNumberish;
  verificationGas: BigNumberish;
  callGasLimit: BigNumberish;
}

const estimateCreationGas = async (
  provider: ethers.providers.JsonRpcProvider,
  initCode: BytesLike
): Promise<ethers.BigNumber> => {
  const initCodeHex = ethers.utils.hexlify(initCode);
  const factory = initCodeHex.substring(0, 42);
  const callData = "0x" + initCodeHex.substring(42);
  return await provider.estimateGas({
    to: factory,
    data: callData,
  });
};

const MULTIPLIER = 2;

export const estimateUserOperationGas =
  (provider: ethers.providers.JsonRpcProvider): UserOperationMiddlewareFn =>
  async (ctx) => {
    if (ethers.BigNumber.from(ctx.op.nonce).isZero()) {
      ctx.op.verificationGasLimit = ethers.BigNumber.from(
        ctx.op.verificationGasLimit
      ).add(await estimateCreationGas(provider, ctx.op.initCode));
    }

    const est = (await provider.send("eth_estimateUserOperationGas", [
      OpToJSON(ctx.op),
      ctx.entryPoint,
    ])) as GasEstimate;

    ctx.op.preVerificationGas = BigNumber.from(est.preVerificationGas).mul(
      MULTIPLIER
    );
    ctx.op.verificationGasLimit = BigNumber.from(est.verificationGas).mul(
      MULTIPLIER
    );
    ctx.op.callGasLimit = BigNumber.from(est.callGasLimit).mul(MULTIPLIER);
  };
