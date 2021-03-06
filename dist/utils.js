'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.computeOrderBy = exports.relationDirective = exports.cypherDirective = exports.isRemoveMutation = exports.isDeleteMutation = exports.isUpdateMutation = exports.isAddMutation = exports.isCreateMutation = undefined;

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _entries = require('babel-runtime/core-js/object/entries');

var _entries2 = _interopRequireDefault(_entries);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

exports.parseArgs = parseArgs;
exports.cypherDirectiveArgs = cypherDirectiveArgs;
exports.isMutation = isMutation;
exports._isNamedMutation = _isNamedMutation;
exports.isAddRelationshipMutation = isAddRelationshipMutation;
exports.typeIdentifiers = typeIdentifiers;
exports.isGraphqlScalarType = isGraphqlScalarType;
exports.isArrayType = isArrayType;
exports.lowFirstLetter = lowFirstLetter;
exports.innerType = innerType;
exports.filtersFromSelections = filtersFromSelections;
exports.getFilterParams = getFilterParams;
exports.innerFilterParams = innerFilterParams;
exports.extractQueryResult = extractQueryResult;
exports.computeSkipLimit = computeSkipLimit;
exports.extractSelections = extractSelections;
exports.fixParamsForAddRelationshipMutation = fixParamsForAddRelationshipMutation;

var _url = require('url');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function parseArg(arg, variableValues) {
  switch (arg.value.kind) {
    case 'IntValue':
      return parseInt(arg.value.value);
      break;
    case 'FloatValue':
      return parseFloat(arg.value.value);
      break;
    case 'Variable':
      return variableValues[arg.name.value];
      break;
    default:
      return arg.value.value;
  }
}

function parseArgs(args, variableValues) {
  // get args from selection.arguments object
  // or from resolveInfo.variableValues if arg is a variable
  // note that variable values override default values

  if (!args || args.length === 0) {
    return {};
  }

  return args.reduce(function(acc, arg) {
    acc[arg.name.value] = parseArg(arg, variableValues);

    return acc;
  }, {});
}

function getDefaultArguments(fieldName, schemaType) {
  // get default arguments for this field from schema

  try {
    return schemaType._fields[fieldName].args.reduce(function(acc, arg) {
      acc[arg.name] = arg.defaultValue;
      return acc;
    }, {});
  } catch (err) {
    return {};
  }
}

function cypherDirectiveArgs(variable, headSelection, schemaType, resolveInfo) {
  var defaultArgs = getDefaultArguments(headSelection.name.value, schemaType);
  var queryArgs = parseArgs(
    headSelection.arguments,
    resolveInfo.variableValues
  );

  var args = (0, _stringify2.default)(
    (0, _assign2.default)(defaultArgs, queryArgs)
  ).replace(/\"([^(\")"]+)\":/g, ' $1: ');

  return args === '{}'
    ? '{this: ' + variable + args.substring(1)
    : '{this: ' + variable + ',' + args.substring(1);
}

function isMutation(resolveInfo) {
  return resolveInfo.operation.operation === 'mutation';
}

function _isNamedMutation(name) {
  return function(resolveInfo) {
    return (
      isMutation(resolveInfo) &&
      resolveInfo.fieldName.split(/(?=[A-Z])/)[0].toLowerCase() ===
        name.toLowerCase()
    );
  };
}

var isCreateMutation = (exports.isCreateMutation = _isNamedMutation('create'));

var isAddMutation = (exports.isAddMutation = _isNamedMutation('add'));

var isUpdateMutation = (exports.isUpdateMutation = _isNamedMutation('update'));

var isDeleteMutation = (exports.isDeleteMutation = _isNamedMutation('delete'));

var isRemoveMutation = (exports.isRemoveMutation = _isNamedMutation('remove'));

function isAddRelationshipMutation(resolveInfo) {
  return (
    isAddMutation(resolveInfo) &&
    resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.some(function(x) {
        return x.name.value === 'MutationMeta';
      })
  );
}

function typeIdentifiers(returnType) {
  var typeName = innerType(returnType).toString();
  return {
    variableName: lowFirstLetter(typeName),
    typeName: typeName
  };
}

function isGraphqlScalarType(type) {
  return (
    type.constructor.name === 'GraphQLScalarType' ||
    type.constructor.name === 'GraphQLEnumType'
  );
}

function isArrayType(type) {
  return type.toString().startsWith('[');
}

function lowFirstLetter(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

function innerType(type) {
  return type.ofType ? innerType(type.ofType) : type;
}

// handles field level schema directives
// TODO: refactor to handle Query/Mutation type schema directives
var directiveWithArgs = function directiveWithArgs(directiveName, args) {
  return function(schemaType, fieldName) {
    function fieldDirective(schemaType, fieldName, directiveName) {
      return schemaType
        .getFields()
        [fieldName].astNode.directives.find(function(e) {
          return e.name.value === directiveName;
        });
    }

    function directiveArgument(directive, name) {
      return directive.arguments.find(function(e) {
        return e.name.value === name;
      }).value.value;
    }

    var directive = fieldDirective(schemaType, fieldName, directiveName);
    var ret = {};
    if (directive) {
      _assign2.default.apply(
        Object,
        [ret].concat(
          (0, _toConsumableArray3.default)(
            args.map(function(key) {
              return (0,
              _defineProperty3.default)({}, key, directiveArgument(directive, key));
            })
          )
        )
      );
    }
    return ret;
  };
};

var cypherDirective = (exports.cypherDirective = directiveWithArgs('cypher', [
  'statement'
]));
var relationDirective = (exports.relationDirective = directiveWithArgs(
  'relation',
  ['name', 'direction']
));

function filtersFromSelections(selections, variableValues) {
  if (
    selections &&
    selections.length &&
    selections[0].arguments &&
    selections[0].arguments.length
  ) {
    return selections[0].arguments.reduce(function(result, x) {
      (result[x.name.value] = argumentValue(
        selections[0],
        x.name.value,
        variableValues
      )) || x.value.value;
      return result;
    }, {});
  }
  return {};
}

function getFilterParams(filters, index) {
  return (0, _entries2.default)(filters).reduce(function(result, _ref2) {
    var _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      key = _ref3[0],
      value = _ref3[1];

    result[key] = index
      ? {
          value: value,
          index: index
        }
      : value;
    return result;
  }, {});
}

function innerFilterParams(filters) {
  return (0, _keys2.default)(filters).length > 0
    ? '{' +
        (0, _entries2.default)(filters)
          .filter(function(_ref4) {
            var _ref5 = (0, _slicedToArray3.default)(_ref4, 1),
              key = _ref5[0];

            return !['first', 'offset', 'orderBy'].includes(key);
          })
          .map(function(_ref6) {
            var _ref7 = (0, _slicedToArray3.default)(_ref6, 2),
              key = _ref7[0],
              value = _ref7[1];

            return (
              key +
              ':$' +
              (typeof value.index === 'undefined'
                ? key
                : value.index + '-' + key)
            );
          })
          .join(',') +
        '}'
    : '';
}

function argumentValue(selection, name, variableValues) {
  var arg = selection.arguments.find(function(a) {
    return a.name.value === name;
  });
  if (!arg) {
    return null;
  } else {
    var key = arg.value.name.value;

    try {
      return variableValues[key];
    } catch (e) {
      return argumentValue(selection, name, variableValues);
    }
  }
}

function argumentValue(selection, name, variableValues) {
  var arg = selection.arguments.find(function(a) {
    return a.name.value === name;
  });
  if (!arg) {
    return null;
  } else {
    return parseArg(arg, variableValues);
  }
}

function extractQueryResult(_ref8, returnType) {
  var records = _ref8.records;

  var _typeIdentifiers = typeIdentifiers(returnType),
    variableName = _typeIdentifiers.variableName;

  return isArrayType(returnType)
    ? records.map(function(record) {
        return record.get(variableName);
      })
    : records.length
      ? records[0].get(variableName)
      : null;
}

function computeSkipLimit(selection, variableValues) {
  var first = argumentValue(selection, 'first', variableValues);
  var offset = argumentValue(selection, 'offset', variableValues);

  if (first === null && offset === null) return '';
  if (offset === null) return '[..' + first + ']';
  if (first === null) return '[' + offset + '..]';
  return '[' + offset + '..' + (parseInt(offset) + parseInt(first)) + ']';
}

var computeOrderBy = (exports.computeOrderBy = function computeOrderBy(
  resolveInfo,
  selection
) {
  var orderByVar = argumentValue(
    resolveInfo.operation.selectionSet.selections[0],
    'orderBy',
    resolveInfo.variableValues
  );

  if (orderByVar == undefined) {
    return '';
  } else {
    var splitIndex = orderByVar.lastIndexOf('_');
    var order = orderByVar.substring(splitIndex + 1);
    var orderBy = orderByVar.substring(0, splitIndex);

    var _typeIdentifiers2 = typeIdentifiers(resolveInfo.returnType),
      variableName = _typeIdentifiers2.variableName;

    return (
      ' ORDER BY ' +
      variableName +
      '.' +
      orderBy +
      ' ' +
      (order === 'asc' ? 'ASC' : 'DESC') +
      ' '
    );
  }
});

function extractSelections(selections, fragments) {
  // extract any fragment selection sets into a single array of selections
  return selections.reduce(function(acc, cur) {
    if (cur.kind === 'FragmentSpread') {
      var recursivelyExtractedSelections = extractSelections(
        fragments[cur.name.value].selectionSet.selections,
        fragments
      );
      return [].concat(
        (0, _toConsumableArray3.default)(acc),
        (0, _toConsumableArray3.default)(recursivelyExtractedSelections)
      );
    } else {
      return [].concat((0, _toConsumableArray3.default)(acc), [cur]);
    }
  }, []);
}

function fixParamsForAddRelationshipMutation(params, resolveInfo) {
  // FIXME: find a better way to map param name in schema to datamodel
  var mutationMeta = void 0,
    fromTypeArg = void 0,
    toTypeArg = void 0;

  try {
    mutationMeta = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.directives.filter(function(x) {
        return x.name.value === 'MutationMeta';
      })[0];
  } catch (e) {
    throw new Error(
      'Missing required MutationMeta directive on add relationship directive'
    );
  }

  try {
    fromTypeArg = mutationMeta.arguments.filter(function(x) {
      return x.name.value === 'from';
    })[0];

    toTypeArg = mutationMeta.arguments.filter(function(x) {
      return x.name.value === 'to';
    })[0];
  } catch (e) {
    throw new Error(
      'Missing required argument in MutationMeta directive (relationship, from, or to)'
    );
  }
  //TODO: need to handle one-to-one and one-to-many

  var fromType = fromTypeArg.value.value,
    toType = toTypeArg.value.value,
    fromVar = lowFirstLetter(fromType),
    toVar = lowFirstLetter(toType),
    fromParam = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.arguments[0].name.value.substr(
        fromVar.length
      ),
    toParam = resolveInfo.schema
      .getMutationType()
      .getFields()
      [resolveInfo.fieldName].astNode.arguments[1].name.value.substr(
        toVar.length
      );

  params[toParam] =
    params[
      resolveInfo.schema.getMutationType().getFields()[
        resolveInfo.fieldName
      ].astNode.arguments[1].name.value
    ];

  params[fromParam] =
    params[
      resolveInfo.schema.getMutationType().getFields()[
        resolveInfo.fieldName
      ].astNode.arguments[0].name.value
    ];

  delete params[
    resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
      .astNode.arguments[1].name.value
  ];

  delete params[
    resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
      .astNode.arguments[0].name.value
  ];

  return params;
}
