import { DBField } from "../../../../../types.js";
import pluralize from "pluralize";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
} from "../../../../filePaths/index.js";
import { ExtendedSchema, Schema } from "../../../types.js";
import { formatTableName, toCamelCase } from "../../../utils.js";
import { generateAuthCheck } from "../utils.js";

const generateDrizzleImports = (schema: Schema, relations: DBField[]) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingular,
    tableNameSingularCapitalised,
    tableNameCamelCase,
  } = formatTableName(tableName);
  const { shared } = getFilePaths();
  const dbIndex = getDbIndexPath();

  const children =
    schema.children !== undefined
      ? schema.children.map((c) => formatTableName(c.tableName))
      : [];

  return `import { db } from "${formatFilePath(dbIndex, {
    prefix: "alias",
    removeExtension: true,
  })}";
import { eq${belongsToUser ? ", and" : ""} } from "drizzle-orm";${
    belongsToUser
      ? `\nimport { getUserAuth } from "${formatFilePath(
          shared.auth.authUtils,
          { prefix: "alias", removeExtension: true }
        )}";`
      : ""
  }
import { type ${tableNameSingularCapitalised}Id, ${tableNameSingular}IdSchema, ${tableNameCamelCase} } from "${formatFilePath(
    shared.orm.schemaDir,
    { prefix: "alias", removeExtension: false }
  )}/${tableNameCamelCase}";
${
  relations.length > 0
    ? relations
        .map(
          (relation) =>
            `import { ${toCamelCase(
              relation.references
            )} } from "${formatFilePath(shared.orm.schemaDir, {
              prefix: "alias",
              removeExtension: false,
            })}/${toCamelCase(relation.references)}";\n`
        )
        .join("")
    : ""
}${
    children.length > 0
      ? children
          .map(
            (child) =>
              `import { ${child.tableNameCamelCase}, type Complete${
                child.tableNameSingularCapitalised
              } } from "${formatFilePath(shared.orm.schemaDir, {
                prefix: "alias",
                removeExtension: false,
              })}/${child.tableNameCamelCase}";\n`
          )
          .join("")
      : ""
  }`;
};

const generatePrismaImports = (schema: Schema) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingular,
    tableNameSingularCapitalised,
    tableNameCamelCase,
  } = formatTableName(tableName);
  const { shared } = getFilePaths();
  const dbIndex = getDbIndexPath();
  return `import { db } from "${formatFilePath(dbIndex, {
    prefix: "alias",
    removeExtension: true,
  })}";${
    belongsToUser
      ? `\nimport { getUserAuth } from "${formatFilePath(
          shared.auth.authUtils,
          { prefix: "alias", removeExtension: true }
        )}";`
      : ""
  }
import { type ${tableNameSingularCapitalised}Id, ${tableNameSingular}IdSchema } from "${formatFilePath(
    shared.orm.schemaDir,
    { removeExtension: false, prefix: "alias" }
  )}/${tableNameCamelCase}";
`;
};

const generateDrizzleGetQuery = (schema: Schema, relations: DBField[]) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameCamelCase,
    tableNameFirstChar,
    tableNamePluralCapitalised,
    tableNameSingular,
  } = formatTableName(tableName);
  const getAuth = generateAuthCheck(schema.belongsToUser);
  return `export const get${tableNamePluralCapitalised} = async () => {${getAuth}
  const rows = await db.select(${
    relations.length > 0
      ? `{ ${tableNameSingular}: ${tableNameCamelCase}, ${relations
          .map(
            (relation) =>
              `${pluralize.singular(
                toCamelCase(relation.references)
              )}: ${toCamelCase(relation.references)}`
          )
          .join(", ")} }`
      : ""
  }).from(${tableNameCamelCase})${
    relations.length > 0
      ? relations
          .map(
            (relation) =>
              `.leftJoin(${toCamelCase(
                relation.references
              )}, eq(${tableNameCamelCase}.${toCamelCase(
                relation.name
              )}, ${toCamelCase(relation.references)}.id))`
          )
          .join("")
      : ""
  }${
    belongsToUser
      ? `.where(eq(${tableNameCamelCase}.userId, session?.user.id!))`
      : ""
  };
  const ${tableNameFirstChar} = rows${
    relations.length > 0
      ? ` .map((r) => ({ ...r.${tableNameSingular}, ${relations
          .map((relation) => {
            const { tableNameSingular: tnSingular } = formatTableName(
              relation.references
            );
            return `${tnSingular}: r.${tnSingular}`;
          })
          .join(", ")}})); `
      : ""
  }
  return { ${tableNameCamelCase}: ${tableNameFirstChar} };
};
`;
};

const generateDrizzleGetByIdQuery = (schema: Schema, relations: DBField[]) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameCamelCase,
    tableNameFirstChar,
    tableNameSingularCapitalised,
    tableNameSingular,
  } = formatTableName(tableName);
  const getAuth = generateAuthCheck(schema.belongsToUser);
  return `export const get${tableNameSingularCapitalised}ById = async (id: ${tableNameSingularCapitalised}Id) => {${getAuth}
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  const [row] = await db.select(${
    relations.length > 0
      ? `{ ${tableNameSingular}: ${tableNameCamelCase}, ${relations
          .map(
            (relation) =>
              `${pluralize.singular(
                toCamelCase(relation.references)
              )}: ${toCamelCase(relation.references)}`
          )
          .join(", ")} }`
      : ""
  }).from(${tableNameCamelCase}).where(${
    belongsToUser ? "and(" : ""
  }eq(${tableNameCamelCase}.id, ${tableNameSingular}Id)${
    belongsToUser
      ? `, eq(${tableNameCamelCase}.userId, session?.user.id!))`
      : ""
  })${
    relations.length > 0
      ? relations
          .map(
            (relation) =>
              `.leftJoin(${toCamelCase(
                relation.references
              )}, eq(${tableNameCamelCase}.${toCamelCase(
                relation.name
              )}, ${toCamelCase(relation.references)}.id))`
          )
          .join("")
      : ""
  };
  if (row === undefined) return {};
  const ${tableNameFirstChar} = ${
    relations.length > 0
      ? ` { ...row.${tableNameSingular}, ${relations
          .map((relation) => {
            const { tableNameSingular: tnSingular } = formatTableName(
              relation.references
            );
            return `${tnSingular}: row.${tnSingular}`;
          })
          .join(", ")} } `
      : "row"
  };
  return { ${tableNameSingular}: ${tableNameFirstChar} };
};
`;
};

const generateDrizzleGetByIdWithChildrenQuery = (
  schema: ExtendedSchema,
  relations: DBField[]
) => {
  const { tableName, belongsToUser, children } = schema;
  const {
    tableNameCamelCase,
    tableNameFirstChar,
    tableNameSingularCapitalised,
    tableNameSingular,
  } = formatTableName(tableName);
  const childrenTableNames = children.map((c) => formatTableName(c.tableName));
  const getAuth = generateAuthCheck(schema.belongsToUser);
  return `export const get${tableNameSingularCapitalised}ByIdWith${childrenTableNames
    .map((c) => c.tableNameCapitalised)
    .join("And")} = async (id: ${tableNameSingularCapitalised}Id) => {${getAuth}
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  const rows = await db.select(${
    children.length > 0
      ? `{ ${tableNameSingular}: ${tableNameCamelCase}, ${children
          .map(
            (child) =>
              `${pluralize.singular(
                toCamelCase(child.tableName)
              )}: ${toCamelCase(child.tableName)}`
          )
          .join(", ")} }`
      : ""
  }).from(${tableNameCamelCase}).where(${
    belongsToUser ? "and(" : ""
  }eq(${tableNameCamelCase}.id, ${tableNameSingular}Id)${
    belongsToUser
      ? `, eq(${tableNameCamelCase}.userId, session?.user.id!))`
      : ""
  })${
    children.length > 0
      ? children
          .map((child) => {
            const {
              tableNameCamelCase: childNameCC,
              tableNameSingular: childNameSingular,
            } = formatTableName(child.tableName);
            return `.leftJoin(${childNameCC}, eq(${tableNameCamelCase}.id, ${childNameCC}.${tableNameSingular}Id))`;
          })
          .join("")
      : ""
  };
  if (rows.length === 0) return {};
  const ${tableNameFirstChar} = rows[0].${tableNameSingular};
  ${
    children.length > 0
      ? children
          .map((c) => {
            const {
              tableNameCamelCase: childCC,
              tableNameFirstChar: childFirstChar,
              tableNameSingularCapitalised: childSingularCapitalised,
              tableNameSingular: childSingular,
            } = formatTableName(c.tableName);
            return `const ${tableNameFirstChar}${childFirstChar} = rows.filter((r) => r.${childSingular} !== null).map((${childFirstChar}) => ${childFirstChar}.${childSingular}) as Complete${childSingularCapitalised}[];`;
          })
          .join("\n  ")
      : ""
  }

  return { ${tableNameSingular}: ${tableNameFirstChar}, ${
    children.length > 0
      ? children
          .map((c) => {
            const {
              tableNameFirstChar: childFirstChar,
              tableNameCamelCase: childNameCC,
            } = formatTableName(c.tableName);
            return `${childNameCC}: ${tableNameFirstChar}${childFirstChar}`;
          })
          .join(", ")
      : ""
  } };
};
`;
};

const generatePrismaGetQuery = (schema: Schema, relations: DBField[]) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameCamelCase,
    tableNameSingular,
    tableNamePluralCapitalised,
    tableNameFirstChar,
  } = formatTableName(tableName);
  const getAuth = generateAuthCheck(schema.belongsToUser);
  return `export const get${tableNamePluralCapitalised} = async () => {${getAuth}
  const ${tableNameFirstChar} = await db.${tableNameSingular}.findMany({${
    belongsToUser ? ` where: {userId: session?.user.id!}` : ""
  }${belongsToUser && relations.length > 0 ? ", " : ""}${
    relations.length > 0
      ? `include: { ${relations
          .map(
            (relation) =>
              `${pluralize.singular(toCamelCase(relation.references))}: true`
          )
          .join(", ")}}`
      : ""
  }});
  return { ${tableNameCamelCase}: ${tableNameFirstChar} };
};
`;
};

const generatePrismaGetByIdQuery = (schema: Schema, relations: DBField[]) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingular,
    tableNameSingularCapitalised,
    tableNameFirstChar,
  } = formatTableName(tableName);
  const getAuth = generateAuthCheck(schema.belongsToUser);
  return `export const get${tableNameSingularCapitalised}ById = async (id: ${tableNameSingularCapitalised}Id) => {${getAuth}
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  const ${tableNameFirstChar} = await db.${tableNameSingular}.findFirst({
    where: { id: ${tableNameSingular}Id${
      belongsToUser ? `, userId: session?.user.id!` : ""
    }}${
      relations.length > 0
        ? `,\n    include: { ${relations
            .map(
              (relation) =>
                `${pluralize.singular(toCamelCase(relation.references))}: true`
            )
            .join(", ")} }\n  `
        : ""
    }});
  return { ${tableNameSingular}: ${tableNameFirstChar} };
};
`;
};

type TJoin = {
  name: string;
  type: "relation" | "child";
  nameCapitalised?: string;
};
const generatePrismaGetByIdQueryWithChildren = (
  schema: ExtendedSchema,
  relations: DBField[]
) => {
  // maybe we have an array of relations + children -> run a set to get unique values then just use the same logic there

  const { tableName, belongsToUser, children } = schema;

  const relationsTableNames: TJoin[] = relations.map((r) => ({
    name: formatTableName(r.references).tableNameSingular,
    type: "relation",
  }));
  const childrenTableNames: TJoin[] = children.map((c) => ({
    name: formatTableName(c.tableName).tableNameCamelCase,
    nameCapitalised: formatTableName(c.tableName).tableNameCapitalised,
    type: "child",
  }));
  const joins = Array.from(
    new Set([...relationsTableNames, ...childrenTableNames])
  );

  const {
    tableNameSingular,
    tableNameCamelCase,
    tableNameSingularCapitalised,
    tableNameFirstChar,
  } = formatTableName(tableName);
  const getAuth = generateAuthCheck(schema.belongsToUser);
  return `export const get${tableNameSingularCapitalised}ByIdWith${childrenTableNames
    .map((c) => c.nameCapitalised)
    .join("And")} = async (id: ${tableNameSingularCapitalised}Id) => {${getAuth}
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  const ${tableNameFirstChar} = await db.${tableNameSingular}.findFirst({
    where: { id: ${tableNameSingular}Id${
      belongsToUser ? `, userId: session?.user.id!` : ""
    }}${
      joins.length > 0
        ? `,\n    include: { ${joins
            .map(
              (j) =>
                `${j.name}: { include: {${
                  j.type === "child" ? tableNameSingular : tableNameCamelCase
                }: true } }`
            )
            .join(", ")} }\n  `
        : ""
    }});
  ${
    childrenTableNames.length > 0
      ? `if (${tableNameFirstChar} === null) return { ${tableNameSingular}: null };
  const { ${joins
    .map((j) => `${j.name}`)
    .join(", ")}, ...${tableNameSingular} } = ${tableNameFirstChar};
`
      : ""
  }
  return { ${tableNameSingular}${
    joins.length > 0
      ? `, ${joins.map((j) => `${j.name}:${j.name}`).join(", ")}`
      : ""
  } };
};
`;
};

export const generateQueries = {
  prisma: {
    imports: generatePrismaImports,
    get: generatePrismaGetQuery,
    getById: generatePrismaGetByIdQuery,
    getByIdWithChildren: generatePrismaGetByIdQueryWithChildren,
  },
  drizzle: {
    imports: generateDrizzleImports,
    get: generateDrizzleGetQuery,
    getById: generateDrizzleGetByIdQuery,
    getByIdWithChildren: generateDrizzleGetByIdWithChildrenQuery,
  },
};
