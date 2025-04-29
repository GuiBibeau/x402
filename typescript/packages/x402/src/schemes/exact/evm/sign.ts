import { Address, Chain, Hex, toHex, Transport } from "viem";
import { getNetworkId } from "../../../shared/network.js";
import { getVersion } from "../../../shared/evm/index.js";
import { authorizationTypes, config, SignerWallet } from "../../../types/shared/evm/index.js";
import { ExactEvmPayloadAuthorization, PaymentRequirements } from "../../../types/verify/index.js";
import { getRandomValues } from "crypto";

/**
 * Signs an EIP-3009 authorization for USDC transfer
 *
 * @param walletClient - The wallet client that will sign the authorization
 * @param params - The authorization parameters containing transfer details
 * @param params.from - The address tokens will be transferred from
 * @param params.to - The address tokens will be transferred to
 * @param params.value - The amount of USDC tokens to transfer (in base units)
 * @param params.validAfter - Unix timestamp after which the authorization becomes valid
 * @param params.validBefore - Unix timestamp before which the authorization is valid
 * @param params.nonce - Random 32-byte nonce to prevent replay attacks
 * @param paymentRequirements - The payment requirements containing asset and network information
 * @param paymentRequirements.asset - The address of the USDC contract
 * @param paymentRequirements.network - The network where the USDC contract exists
 * @param paymentRequirements.extra - The extra information containing the name and version of the ERC20 contract
 * @returns The signature for the authorization
 */
export async function signAuthorization<transport extends Transport, chain extends Chain>(
  walletClient: SignerWallet<chain, transport>,
  { from, to, value, validAfter, validBefore, nonce }: ExactEvmPayloadAuthorization,
  { asset, network, extra }: PaymentRequirements,
): Promise<{ signature: Hex }> {
  const chainId = getNetworkId(network);
  const name = extra?.name ?? config[chainId].usdcName;
  const version = extra?.version ?? (await getVersion(walletClient));

  const data = {
    account: walletClient.account!,
    types: authorizationTypes,
    domain: {
      name,
      version,
      chainId,
      verifyingContract: asset as Address,
    },
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce: nonce,
    },
  };

  const signature = await walletClient.signTypedData(data);

  return {
    signature,
  };
}

/**
 * Generates a random 32-byte nonce for use in authorization signatures
 *
 * @returns A random 32-byte nonce as a hex string
 */
export function createNonce(): Hex {
  return toHex(getRandomValues(new Uint8Array(32)));
}
