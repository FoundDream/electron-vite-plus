export interface RuntimeTarget {
  node: string;
  chrome: string;
}

export const electronRuntimeTargets: Readonly<Record<number, RuntimeTarget>> = {
  32: { node: "20.16", chrome: "128" },
  33: { node: "20.18", chrome: "130" },
  34: { node: "20.18", chrome: "132" },
  35: { node: "22.14", chrome: "134" },
  36: { node: "22.14", chrome: "136" },
  37: { node: "22.16", chrome: "138" },
  38: { node: "22.19", chrome: "140" },
  39: { node: "22.20", chrome: "142" },
  40: { node: "24.11", chrome: "144" },
  41: { node: "24.14", chrome: "146" },
  42: { node: "24.15", chrome: "148" },
  43: { node: "24.17", chrome: "150" },
};

const supportedElectronMajors = Object.keys(electronRuntimeTargets).map(Number);

export const minimumElectronMajor = Math.min(...supportedElectronMajors);
export const maximumElectronMajor = Math.max(...supportedElectronMajors);

export function resolveRuntimeTarget(major: number | undefined): RuntimeTarget {
  const selectedMajor =
    major === undefined
      ? minimumElectronMajor
      : Math.min(Math.max(major, minimumElectronMajor), maximumElectronMajor);
  return electronRuntimeTargets[selectedMajor]!;
}
