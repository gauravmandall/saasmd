import { Separator, checkbox, select, confirm } from "@inquirer/prompts";
import { Packages } from "./utils.js";
import {
  AuthType,
  AvailablePackage,
  ComponentLibType,
  DBProvider,
  DBType,
  InitOptions,
  ORMType,
  PMType,
  PackageChoice,
} from "../../types.js";
import { DBProviders } from "../init/utils.js";
import { AuthProvider, AuthProviders } from "./auth/next-auth/utils.js";
import { readConfigFile } from "../../utils.js";
import { consola } from "consola";

const nullOption = { name: "None", value: null };

export const askComponentLib = async (options: InitOptions) => {
  return (
    options.componentLib ??
    ((await select({
      message: "Select a component library to use:",
      choices: [...Packages.componentLib, new Separator(), nullOption],
    })) as ComponentLibType | null)
  );
};

export const askOrm = async (options: InitOptions) => {
  return (
    options.orm ??
    ((await select({
      message: "Select an ORM to use:",
      choices: [...Packages.orm, new Separator(), nullOption],
    })) as ORMType | null)
  );
};

export const askDbType = async (options: InitOptions) => {
  return (
    options.db ??
    ((await select({
      message: "Please choose your DB type",
      choices: [
        { name: "Postgres", value: "pg" },
        {
          name: "MySQL",
          value: "mysql",
        },
        {
          name: "SQLite",
          value: "sqlite",
        },
      ],
    })) as DBType)
  );
};

export const askDbProvider = async (
  options: InitOptions,
  dbType: DBType,
  ppm: PMType
) => {
  const dbProviders = DBProviders[dbType].filter((p) => {
    if (ppm === "bun") return p.value !== "better-sqlite3";
    else return p.value !== "bun-sqlite";
  });
  return (
    options.dbProvider ??
    ((await select({
      message: "Please choose your DB Provider",
      choices: dbProviders,
    })) as DBProvider)
  );
};

export const askPscale = async (options: InitOptions) => {
  return (
    options.dbProvider ??
    (await confirm({
      message: "Are you using PlanetScale?",
      default: false,
    }))
  );
};

export const askExampleModel = async (options: InitOptions) => {
  return (
    options.includeExample ??
    (await confirm({
      message:
        "Would you like to include an example model? (suggested for new users)",
      default: false,
    }))
  );
};

export const askAuth = async (options: InitOptions) => {
  return (
    options.auth ??
    ((await select({
      message: "Select an authentication package to use:",
      choices: [...Packages.auth, new Separator(), nullOption],
    })) as AuthType | null)
  );
};

export const askAuthProvider = async () => {
  return (await checkbox({
    message: "Select a provider to add",
    choices: Object.keys(AuthProviders).map((p) => {
      return { name: p, value: p };
    }),
  })) as AuthProvider[];
};

export const askMiscPackages = async (
  existingPackages: AvailablePackage[],
  hasOrmAndAuth: boolean
) => {
  let uninstalledPackages: PackageChoice[] = [];

  if (existingPackages.length === 0) {
    const { packages: packagesPostOrmAndAuth } = readConfigFile();
    uninstalledPackages = Packages.misc.filter(
      (p) => !packagesPostOrmAndAuth.includes(p.value)
    );
  } else {
    uninstalledPackages = Packages.misc.filter(
      (p) => !existingPackages.includes(p.value)
    );
  }
  if (hasOrmAndAuth === false)
    uninstalledPackages = uninstalledPackages.map((pkg) =>
      pkg.value === "stripe"
        ? {
            ...pkg,
            disabled: "(you must have an ORM and Auth to install Stripe)",
          }
        : pkg
    );

  if (uninstalledPackages.length > 0) {
    return await checkbox({
      message: "Select any miscellaneous packages to add:",
      choices: uninstalledPackages,
    });
  } else {
    consola.info("All available packages already installed.");
    return [];
  }
};
