// Rebuild, sync and install the iOS app on a paired iPhone, over Wi-Fi or cable.
//
//   npm run ios:install               build everything and install
//   npm run ios:install -- --check    only report whether the phone is reachable
//   npm run ios:install -- --no-build install the last build again
//   npm run ios:install -- --renew    let Xcode renew an expired signing profile
//
// Installs over the existing app and never uninstalls it, so app data stays.
// Set IOS_DEVICE to a UDID when more than one iPhone is paired.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Outside the repository, so builds leave nothing to commit.
const derivedData = path.join(homedir(), "Library/Developer/Xcode/DerivedData/MacroMaxxer-ios-install");
const appPath = path.join(derivedData, "Build/Products/Debug-iphoneos/App.app");
const FLAGS = ["--check", "--no-build", "--renew"];
const args = process.argv.slice(2);
const unknown = args.filter((arg) => !FLAGS.includes(arg));
if (unknown.length) fail(`Unknown option: ${unknown.join(", ")}. Options: ${FLAGS.join(", ")}`);

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function run(label, command, commandArgs, hint = "") {
  console.log(`\n▸ ${label}`);
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0) {
    fail(`${label} failed.${result.error ? ` ${result.error.message}` : ""}${hint ? `\n${hint}` : ""}`);
  }
}

function findPhone() {
  const folder = mkdtempSync(path.join(tmpdir(), "ios-install-"));
  const file = path.join(folder, "devices.json");
  try {
    const result = spawnSync("xcrun", ["devicectl", "list", "devices", "--quiet", "--timeout", "20", "--json-output", file], { encoding: "utf8" });
    if (!existsSync(file)) fail(`Could not list devices. ${result.stderr ?? ""}`);
    const phones = (JSON.parse(readFileSync(file, "utf8")).result?.devices ?? [])
      .map(({ properties: { hardware = {}, connection = {}, state = {} } = {}, deviceProperties = {} }) => ({
        udid: hardware.udid,
        name: state.deviceName ?? deviceProperties.name ?? hardware.marketingName,
        model: hardware.marketingName,
        kind: hardware.deviceType,
        physical: hardware.reality === "physical",
        paired: connection.pairingState === "paired",
        state: connection.state,
        transport: connection.transportType,
      }))
      .filter((device) => device.physical && device.paired && device.kind === "iPhone");
    const wanted = process.env.IOS_DEVICE;
    const matches = wanted ? phones.filter((phone) => phone.udid === wanted) : phones;
    if (matches.length === 0) fail(wanted ? `No paired iPhone has the UDID ${wanted}.` : "No paired iPhone found. Pair it in Xcode, Window > Devices and Simulators.");
    if (matches.length > 1) fail(`Several iPhones are paired. Set IOS_DEVICE to one of:\n${matches.map((phone) => `  ${phone.udid}  ${phone.name}`).join("\n")}`);
    return matches[0];
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

const phone = findPhone();
console.log(`▸ ${phone.name} (${phone.model}): ${phone.state}${phone.transport ? `, ${phone.transport}` : ""}`);
if (!phone.state || phone.state === "unavailable") {
  fail([
    "The iPhone is paired but not reachable, so nothing was built or installed.",
    "  1. Unlock the iPhone and keep the screen on.",
    "  2. Put it on the same Wi-Fi as this Mac, with any VPN off.",
    "  3. On shared or guest Wi-Fi that keeps devices apart, turn on the iPhone's",
    "     Personal Hotspot and join it from this Mac, or use a cable.",
  ].join("\n"));
}
if (args.includes("--check")) process.exit(0);

if (!args.includes("--no-build")) {
  run("Build the web bundle", "npm", ["run", "build:capacitor"]);
  run("Sync into the iOS project", "npx", ["cap", "sync", "ios"]);
  run("Build and sign the app", "xcodebuild", [
    "-project", "ios/App/App.xcodeproj", "-scheme", "App", "-configuration", "Debug",
    "-destination", "generic/platform=iOS", "-derivedDataPath", derivedData, "-quiet",
    ...(args.includes("--renew") ? ["-allowProvisioningUpdates"] : []),
    "build",
  ], "If the error mentions signing or a profile, run: npm run ios:install -- --renew");
} else if (!existsSync(appPath)) {
  fail("There is no earlier build to install. Run without --no-build.");
}

run("Install over the existing app", "xcrun", ["devicectl", "device", "install", "app", "--device", phone.udid, appPath],
  "The app was not removed. If the profile expired, run: npm run ios:install -- --renew");
console.log("\n✓ Installed. App data was left in place.");
