import {
  computeSkipLimit,
  cypherDirective,
  cypherDirectiveArgs,
  filtersFromSelections,
  innerFilterParams,
  getFilterParams,
  innerType,
  isArrayType,
  isGraphqlScalarType,
  extractSelections,
  relationDirective
} from './utils';

export function buildCypherSelection({
  initial,
  selections,
  variableName,
  schemaType,
  resolveInfo,
  paramIndex = 1
}) {
  if (!selections.length) {
    return [initial, {}];
  }

  const filterParams = getFilterParams(
    filtersFromSelections(selections, resolveInfo.variableValues),
    paramIndex
  );
  const shallowFilterParams = Object.entries(filterParams).reduce(
    (result, [key, value]) => {
      result[`${value.index}-${key}`] = value.value;
      return result;
    },
    {}
  );

  const [headSelection, ...tailSelections] = selections;

  const tailParams = {
    selections: tailSelections,
    variableName,
    schemaType,
    resolveInfo
  };

  const recurse = args => {
    paramIndex =
      Object.keys(shallowFilterParams).length > 0 ? paramIndex + 1 : paramIndex;
    const [subSelection, subFilterParams] = buildCypherSelection({
      ...args,
      ...{ paramIndex }
    });
    return [subSelection, { ...shallowFilterParams, ...subFilterParams }];
  };

  const fieldName = headSelection.name.value;
  const commaIfTail = tailSelections.length > 0 ? ',' : '';

  // Schema meta fields(__schema, __typename, etc)
  if (!schemaType.getFields()[fieldName]) {
    return recurse({
      initial: tailSelections.length
        ? initial
        : initial.substring(0, initial.lastIndexOf(',')),
      ...tailParams
    });
  }

  const fieldType = schemaType.getFields()[fieldName].type;
  const innerSchemaType = innerType(fieldType); // for target "type" aka label
  const { statement: customCypher } = cypherDirective(schemaType, fieldName);

  // Database meta fields(_id)
  if (fieldName === '_id') {
    return recurse({
      initial: `${initial}${fieldName}: ID(${variableName})${commaIfTail}`,
      ...tailParams
    });
  }

  // Main control flow
  if (isGraphqlScalarType(innerSchemaType)) {
    if (customCypher) {
      return recurse({
        initial: `${initial}${fieldName}: apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
          variableName,
          headSelection,
          schemaType,
          resolveInfo
        )}, false)${commaIfTail}`,
        ...tailParams
      });
    }

    // graphql scalar type, no custom cypher statement
    return recurse({
      initial: `${initial} .${fieldName} ${commaIfTail}`,
      ...tailParams
    });
  }

  // We have a graphql object type

  const nestedVariable = variableName + '_' + fieldName;
  const skipLimit = computeSkipLimit(headSelection, resolveInfo.variableValues);

  if (
    innerSchemaType &&
    innerSchemaType.astNode &&
    innerSchemaType.astNode.kind === 'InterfaceTypeDefinition'
  ) {
    const interfaceName = innerSchemaType.name;
    // get common selections
    const commonSelections = headSelection.selectionSet.selections.filter(
      item => item.kind === 'Field'
    );
    // get the inlinefragments
    const fragments = headSelection.selectionSet.selections.filter(
      item => item.kind === 'InlineFragment'
    );

    // create an object for each fragment containing type, selections and subselections
    const fragmentMap = fragments.map(fragment => {
      // name of the current fragment
      const implementationName = fragment.typeCondition.name.value;
      // merge selections
      const selections = [
        ...commonSelections,
        ...fragment.selectionSet.selections
      ];
      // get the graphqlObjectType for our fragment
      const schemaType = resolveInfo.schema._implementations[
        interfaceName
      ].find(intfc => intfc.name === implementationName);

      // generate subselections
      const subSelections = extractSelections(
        selections,
        resolveInfo.fragments
      );
      const subSelection = recurse({
        initial: '',
        selections: subSelections,
        variableName: nestedVariable + '_frag' + implementationName,
        schemaType: schemaType,
        resolveInfo
      });
      return {
        selections: selections,
        name: implementationName,
        // get graphql schema type for implementation
        type: schemaType,
        subSelection: subSelection
      };
    });

    let selection;

    if (customCypher) {
      // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])
      const fieldIsList = !!fieldType.ofType;

      selection = recurse({
        initial: `${initial}${fieldName}: ${
          fieldIsList ? '' : 'head('
        }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
          variableName,
          headSelection,
          schemaType,
          resolveInfo
        )}, true) | ${nestedVariable} {${subSelection[0]}}]${
          fieldIsList ? '' : ')'
        }${skipLimit} ${commaIfTail}`,
        ...tailParams
      });
    } else {
      // graphql object type, no custom cypher

      const { name: relType, direction: relDirection } = relationDirective(
        schemaType,
        fieldName
      );

      const queryParams = innerFilterParams(filterParams);

      selection = recurse({
        initial: `${initial}${fieldName}: ${
          !isArrayType(fieldType) ? 'head(' : ''
        }${fragmentMap
          .map(fragment => {
            const varName = nestedVariable + '_frag' + fragment.name;
            return `[(${variableName})${
              relDirection === 'in' || relDirection === 'IN' ? '<' : ''
            }-[:${relType}]-${
              relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
            }(${varName}:${
              fragment.name
            }${queryParams}) | ${varName} {FRAGMENT_TYPE: "${fragment.name}", ${
              fragment.subSelection[0]
            }}]`;
          })
          .join(' + ')}${
          !isArrayType(fieldType) ? ')' : ''
        }${skipLimit} ${commaIfTail}`,
        ...tailParams
      });
    }

    return [
      selection[0],
      {
        ...selection[1],
        ...fragmentMap.map(fragment => fragment.subSelection[1])
      }
    ];
  }

  const subSelections = extractSelections(
    headSelection.selectionSet.selections,
    resolveInfo.fragments
  );

  const subSelection = recurse({
    initial: '',
    selections: subSelections,
    variableName: nestedVariable,
    schemaType: innerSchemaType,
    resolveInfo
  });

  let selection;

  if (customCypher) {
    // similar: [ x IN apoc.cypher.runFirstColumn("WITH {this} AS this MATCH (this)--(:Genre)--(o:Movie) RETURN o", {this: movie}, true) |x {.title}][1..2])
    const fieldIsList = !!fieldType.ofType;

    selection = recurse({
      initial: `${initial}${fieldName}: ${
        fieldIsList ? '' : 'head('
      }[ ${nestedVariable} IN apoc.cypher.runFirstColumn("${customCypher}", ${cypherDirectiveArgs(
        variableName,
        headSelection,
        schemaType,
        resolveInfo
      )}, true) | ${nestedVariable} {${subSelection[0]}}]${
        fieldIsList ? '' : ')'
      }${skipLimit} ${commaIfTail}`,
      ...tailParams
    });
  } else {
    // graphql object type, no custom cypher

    const { name: relType, direction: relDirection } = relationDirective(
      schemaType,
      fieldName
    );

    const queryParams = innerFilterParams(filterParams);

    selection = recurse({
      initial: `${initial}${fieldName}: ${
        !isArrayType(fieldType) ? 'head(' : ''
      }[(${variableName})${
        relDirection === 'in' || relDirection === 'IN' ? '<' : ''
      }-[:${relType}]-${
        relDirection === 'out' || relDirection === 'OUT' ? '>' : ''
      }(${nestedVariable}:${
        innerSchemaType.name
      }${queryParams}) | ${nestedVariable} {${subSelection[0]}}]${
        !isArrayType(fieldType) ? ')' : ''
      }${skipLimit} ${commaIfTail}`,
      ...tailParams
    });
  }

  return [selection[0], { ...selection[1], ...subSelection[1] }];
}
