// Pure CLI-arg parsing for auth-config.mjs, extracted so it's unit-testable without touching
// the filesystem, the network, or firebase-tools' login state. Takes argv already sliced to just
// the user-supplied arguments (i.e. process.argv.slice(2)).
//
// domain: null when --domain wasn't passed at all; the following argv entry when it was (which
// is `undefined` if --domain was the last argument — the caller is responsible for treating a
// present-but-valueless --domain as an error, same as before this was extracted).
export function parseArgs(argv) {
  const domainIdx = argv.indexOf('--domain');
  const domain = domainIdx === -1 ? null : argv[domainIdx + 1];
  return {
    domain,
    withTestNumber: argv.includes('--with-test-number'),
    removeTestNumber: argv.includes('--remove-test-number'),
  };
}
