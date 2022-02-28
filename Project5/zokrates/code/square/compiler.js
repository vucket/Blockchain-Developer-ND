const zokrates = require("zokrates-js");

zokrates.initialize().then((zokratesProvider) => {
  //const source = "def main(private field a) -> field: return a * a";
  const source = `def main(private field a, field b) -> (field):
    field result = if a * a == b then 1 else 0 fi
    return result`;
  // compilation
  const artifacts = zokratesProvider.compile(source);

  // computation
  const { witness, output } = zokratesProvider.computeWitness(artifacts, ["2"]);

  // run setup
  const keypair = zokratesProvider.setup(artifacts.program);

  // generate proof
  const proof = zokratesProvider.generateProof(
    artifacts.program,
    witness,
    keypair.pk
  );
  console.log("PROOF", proof);

  // export solidity verifier
  const verifier = zokratesProvider.exportSolidityVerifier(keypair.vk, "v1");
});
