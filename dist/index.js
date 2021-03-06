'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.makeAugmentedSchema = exports.augmentSchema = exports.neo4jgraphql = undefined;

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _entries = require('babel-runtime/core-js/object/entries');

var _entries2 = _interopRequireDefault(_entries);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(
  _objectWithoutProperties2
);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var neo4jgraphql = (exports.neo4jgraphql = (function() {
  var _ref = (0, _asyncToGenerator3.default)(
    /*#__PURE__*/ _regenerator2.default.mark(function _callee(
      object,
      params,
      context,
      resolveInfo
    ) {
      var debug =
        arguments.length > 4 && arguments[4] !== undefined
          ? arguments[4]
          : true;

      var query,
        cypherParams,
        cypherFunction,
        _cypherFunction,
        _cypherFunction2,
        session,
        result;

      return _regenerator2.default.wrap(
        function _callee$(_context) {
          while (1) {
            switch ((_context.prev = _context.next)) {
              case 0:
                if (!(0, _auth.checkRequestError)(context)) {
                  _context.next = 2;
                  break;
                }

                throw new Error((0, _auth.checkRequestError)(context));

              case 2:
                query = void 0;
                cypherParams = void 0;
                cypherFunction = (0, _utils.isMutation)(resolveInfo)
                  ? cypherMutation
                  : cypherQuery;
                _cypherFunction = cypherFunction(params, context, resolveInfo);
                _cypherFunction2 = (0, _slicedToArray3.default)(
                  _cypherFunction,
                  2
                );
                query = _cypherFunction2[0];
                cypherParams = _cypherFunction2[1];

                if (debug) {
                  console.log(query);
                  console.log(cypherParams);
                }

                session = context.driver.session();
                result = void 0;
                _context.prev = 12;
                _context.next = 15;
                return session.run(query, cypherParams);

              case 15:
                result = _context.sent;

              case 16:
                _context.prev = 16;

                session.close();
                return _context.finish(16);

              case 19:
                return _context.abrupt(
                  'return',
                  (0, _utils.extractQueryResult)(result, resolveInfo.returnType)
                );

              case 20:
              case 'end':
                return _context.stop();
            }
          }
        },
        _callee,
        this,
        [[12, , 16, 19]]
      );
    })
  );

  return function neo4jgraphql(_x2, _x3, _x4, _x5) {
    return _ref.apply(this, arguments);
  };
})());

exports.cypherQuery = cypherQuery;
exports.cypherMutation = cypherMutation;

var _filter = require('lodash/filter');

var _filter2 = _interopRequireDefault(_filter);

var _utils = require('./utils');

var _selections = require('./selections');

var _augmentSchema = require('./augmentSchema');

var _auth = require('./auth');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var getOuterSkipLimit = function getOuterSkipLimit(first) {
  return 'SKIP $offset' + (first > -1 ? ' LIMIT $first' : '');
};

function cypherQuery(_ref2, context, resolveInfo) {
  var _ref2$first = _ref2.first,
    first = _ref2$first === undefined ? -1 : _ref2$first,
    _ref2$offset = _ref2.offset,
    offset = _ref2$offset === undefined ? 0 : _ref2$offset,
    _id = _ref2._id,
    orderBy = _ref2.orderBy,
    otherParams = (0, _objectWithoutProperties3.default)(_ref2, [
      'first',
      'offset',
      '_id',
      'orderBy'
    ]);

  var _typeIdentifiers = (0, _utils.typeIdentifiers)(resolveInfo.returnType),
    typeName = _typeIdentifiers.typeName,
    variableName = _typeIdentifiers.variableName;

  var schemaType = resolveInfo.schema.getType(typeName);

  var filteredFieldNodes = (0, _filter2.default)(
    resolveInfo.fieldNodes,
    function(n) {
      return n.name.value === resolveInfo.fieldName;
    }
  );

  // FIXME: how to handle multiple fieldNode matches
  var selections = (0, _utils.extractSelections)(
    filteredFieldNodes[0].selectionSet.selections,
    resolveInfo.fragments
  );

  var _Object$entries$reduc = (0, _entries2.default)(
      (0, _extends3.default)({ offset: offset, first: first }, otherParams)
    ).reduce(
      function(_ref3, _ref4) {
        var _ref6 = (0, _slicedToArray3.default)(_ref3, 2),
          nulls = _ref6[0],
          nonNulls = _ref6[1];

        var _ref5 = (0, _slicedToArray3.default)(_ref4, 2),
          key = _ref5[0],
          value = _ref5[1];

        if (value === null) {
          nulls[key] = value;
        } else {
          nonNulls[key] = value;
        }
        return [nulls, nonNulls];
      },
      [{}, {}]
    ),
    _Object$entries$reduc2 = (0, _slicedToArray3.default)(
      _Object$entries$reduc,
      2
    ),
    nullParams = _Object$entries$reduc2[0],
    nonNullParams = _Object$entries$reduc2[1];

  var argString = (0, _utils.innerFilterParams)(
    (0, _utils.getFilterParams)(nonNullParams)
  );

  var outerSkipLimit = getOuterSkipLimit(first);
  var orderByValue = (0, _utils.computeOrderBy)(resolveInfo, selections);

  var query = void 0;

  //TODO: wrap in try catch
  var queryTypeCypherDirective = resolveInfo.schema
    .getQueryType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(function(x) {
      return x.name.value === 'cypher';
    });

  var _buildCypherSelection = (0, _selections.buildCypherSelection)({
      initial: '',
      selections: selections,
      variableName: variableName,
      schemaType: schemaType,
      resolveInfo: resolveInfo,
      paramIndex: 1
    }),
    _buildCypherSelection2 = (0, _slicedToArray3.default)(
      _buildCypherSelection,
      2
    ),
    subQuery = _buildCypherSelection2[0],
    subParams = _buildCypherSelection2[1];

  if (queryTypeCypherDirective) {
    // QueryType with a @cypher directive
    var cypherQueryArg = queryTypeCypherDirective.arguments.find(function(x) {
      return x.name.value === 'statement';
    });

    query =
      'WITH apoc.cypher.runFirstColumn("' +
      cypherQueryArg.value.value +
      '", ' +
      argString +
      ', True) AS x UNWIND x AS ' +
      variableName +
      '\n    RETURN ' +
      variableName +
      ' {' +
      subQuery +
      '} AS ' +
      variableName +
      orderByValue +
      ' ' +
      outerSkipLimit;
  } else {
    // No @cypher directive on QueryType

    // FIXME: support IN for multiple values -> WHERE
    var idWherePredicate =
      typeof _id !== 'undefined' ? 'ID(' + variableName + ')=' + _id : '';
    var nullFieldPredicates = (0, _keys2.default)(nullParams).map(function(
      key
    ) {
      return variableName + '.' + key + ' IS NULL';
    });
    var predicateClauses = [idWherePredicate]
      .concat((0, _toConsumableArray3.default)(nullFieldPredicates))
      .filter(function(predicate) {
        return !!predicate;
      })
      .join(' AND ');
    var predicate = predicateClauses ? 'WHERE ' + predicateClauses + ' ' : '';

    query =
      'MATCH (' +
      variableName +
      ':' +
      typeName +
      ' ' +
      argString +
      ') ' +
      predicate +
      // ${variableName} { ${selection} } as ${variableName}`;
      ('RETURN ' +
        variableName +
        ' {' +
        subQuery +
        '} AS ' +
        variableName +
        orderByValue +
        ' ' +
        outerSkipLimit);
  }

  return [query, (0, _extends3.default)({}, nonNullParams, subParams)];
}

function cypherMutation(_ref7, context, resolveInfo) {
  var _ref7$first = _ref7.first,
    first = _ref7$first === undefined ? -1 : _ref7$first,
    _ref7$offset = _ref7.offset,
    offset = _ref7$offset === undefined ? 0 : _ref7$offset,
    _id = _ref7._id,
    orderBy = _ref7.orderBy,
    otherParams = (0, _objectWithoutProperties3.default)(_ref7, [
      'first',
      'offset',
      '_id',
      'orderBy'
    ]);

  // FIXME: lots of duplication here with cypherQuery, extract into util module

  var _typeIdentifiers2 = (0, _utils.typeIdentifiers)(resolveInfo.returnType),
    typeName = _typeIdentifiers2.typeName,
    variableName = _typeIdentifiers2.variableName;

  var schemaType = resolveInfo.schema.getType(typeName);

  var filteredFieldNodes = (0, _filter2.default)(
    resolveInfo.fieldNodes,
    function(n) {
      return n.name.value === resolveInfo.fieldName;
    }
  );

  // FIXME: how to handle multiple fieldNode matches
  var selections = (0, _utils.extractSelections)(
    filteredFieldNodes[0].selectionSet.selections,
    resolveInfo.fragments
  );

  if (selections.length === 0) {
    // FIXME: why aren't the selections found in the filteredFieldNode?
    selections = (0, _utils.extractSelections)(
      resolveInfo.operation.selectionSet.selections,
      resolveInfo.fragments
    );
  }

  var outerSkipLimit = getOuterSkipLimit(first);
  var orderByValue = (0, _utils.computeOrderBy)(resolveInfo, selections);

  var query = void 0;
  var mutationTypeCypherDirective = resolveInfo.schema
    .getMutationType()
    .getFields()
    [resolveInfo.fieldName].astNode.directives.find(function(x) {
      return x.name.value === 'cypher';
    });

  var params =
    ((0, _utils.isCreateMutation)(resolveInfo) ||
      (0, _utils.isUpdateMutation)(resolveInfo)) &&
    !mutationTypeCypherDirective
      ? (0, _extends3.default)(
          { params: otherParams },
          { first: first, offset: offset }
        )
      : (0, _extends3.default)({}, otherParams, {
          first: first,
          offset: offset
        });

  if (mutationTypeCypherDirective) {
    // FIXME: support IN for multiple values -> WHERE
    var argString = (0, _utils.innerFilterParams)(
      (0, _utils.getFilterParams)(params.params || params)
    );

    var cypherQueryArg = mutationTypeCypherDirective.arguments.find(function(
      x
    ) {
      return x.name.value === 'statement';
    });

    var _buildCypherSelection3 = (0, _selections.buildCypherSelection)({
        initial: '',
        selections: selections,
        variableName: variableName,
        schemaType: schemaType,
        resolveInfo: resolveInfo,
        paramIndex: 1
      }),
      _buildCypherSelection4 = (0, _slicedToArray3.default)(
        _buildCypherSelection3,
        2
      ),
      subQuery = _buildCypherSelection4[0],
      subParams = _buildCypherSelection4[1];

    params = (0, _extends3.default)({}, params, subParams);

    query =
      'CALL apoc.cypher.doIt("' +
      cypherQueryArg.value.value +
      '", ' +
      argString +
      ') YIELD value\n    WITH apoc.map.values(value, [keys(value)[0]])[0] AS ' +
      variableName +
      '\n    RETURN ' +
      variableName +
      ' {' +
      subQuery +
      '} AS ' +
      variableName +
      orderByValue +
      ' ' +
      outerSkipLimit;
  } else if ((0, _utils.isCreateMutation)(resolveInfo)) {
    query = 'MERGE (' + variableName + ':' + typeName + ') ';
    query += 'SET ' + variableName + ' = $params ';
    //query += `RETURN ${variable}`;

    var _buildCypherSelection5 = (0, _selections.buildCypherSelection)({
        initial: '',
        selections: selections,
        variableName: variableName,
        schemaType: schemaType,
        resolveInfo: resolveInfo,
        paramIndex: 1
      }),
      _buildCypherSelection6 = (0, _slicedToArray3.default)(
        _buildCypherSelection5,
        2
      ),
      _subQuery = _buildCypherSelection6[0],
      _subParams = _buildCypherSelection6[1];

    params = (0, _extends3.default)({}, params, _subParams);

    query +=
      'RETURN ' + variableName + ' {' + _subQuery + '} AS ' + variableName;
  } else if ((0, _utils.isAddMutation)(resolveInfo)) {
    var mutationMeta = void 0,
      relationshipNameArg = void 0,
      fromTypeArg = void 0,
      toTypeArg = void 0;

    try {
      mutationMeta = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.directives.find(function(x) {
          return x.name.value === 'MutationMeta';
        });
    } catch (e) {
      throw new Error(
        'Missing required MutationMeta directive on add relationship directive'
      );
    }

    try {
      relationshipNameArg = mutationMeta.arguments.find(function(x) {
        return x.name.value === 'relationship';
      });

      fromTypeArg = mutationMeta.arguments.find(function(x) {
        return x.name.value === 'from';
      });

      toTypeArg = mutationMeta.arguments.find(function(x) {
        return x.name.value === 'to';
      });
    } catch (e) {
      throw new Error(
        'Missing required argument in MutationMeta directive (relationship, from, or to)'
      );
    }
    //TODO: need to handle one-to-one and one-to-many

    var fromType = fromTypeArg.value.value,
      toType = toTypeArg.value.value,
      fromVar = (0, _utils.lowFirstLetter)(fromType),
      toVar = (0, _utils.lowFirstLetter)(toType),
      relationshipName = relationshipNameArg.value.value,
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

    var _buildCypherSelection7 = (0, _selections.buildCypherSelection)({
        initial: '',
        selections: selections,
        variableName: variableName,
        schemaType: schemaType,
        resolveInfo: resolveInfo,
        paramIndex: 1
      }),
      _buildCypherSelection8 = (0, _slicedToArray3.default)(
        _buildCypherSelection7,
        2
      ),
      _subQuery2 = _buildCypherSelection8[0],
      _subParams2 = _buildCypherSelection8[1];

    params = (0, _extends3.default)({}, params, _subParams2);

    query =
      'MATCH (' +
      fromVar +
      ':' +
      fromType +
      ' {' +
      fromParam +
      ': $' +
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value +
      '})\n       MATCH (' +
      toVar +
      ':' +
      toType +
      ' {' +
      toParam +
      ': $' +
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[1].name.value +
      '})\n      MERGE (' +
      fromVar +
      ')-[:' +
      relationshipName +
      ']->(' +
      toVar +
      ')\n      RETURN ' +
      fromVar +
      ' {' +
      _subQuery2 +
      '} AS ' +
      fromVar +
      ';';
  } else if ((0, _utils.isUpdateMutation)(resolveInfo)) {
    var idParam = resolveInfo.schema.getMutationType().getFields()[
      resolveInfo.fieldName
    ].astNode.arguments[0].name.value;

    query =
      'MATCH (' +
      variableName +
      ':' +
      typeName +
      ' {' +
      idParam +
      ': $params.' +
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value +
      '}) ';
    query += 'SET ' + variableName + ' += $params ';

    var _buildCypherSelection9 = (0, _selections.buildCypherSelection)({
        initial: '',
        selections: selections,
        variableName: variableName,
        schemaType: schemaType,
        resolveInfo: resolveInfo,
        paramIndex: 1
      }),
      _buildCypherSelection10 = (0, _slicedToArray3.default)(
        _buildCypherSelection9,
        2
      ),
      _subQuery3 = _buildCypherSelection10[0],
      _subParams3 = _buildCypherSelection10[1];

    params = (0, _extends3.default)({}, params, _subParams3);

    query +=
      'RETURN ' + variableName + ' {' + _subQuery3 + '} AS ' + variableName;
  } else if ((0, _utils.isDeleteMutation)(resolveInfo)) {
    var _idParam = resolveInfo.schema.getMutationType().getFields()[
      resolveInfo.fieldName
    ].astNode.arguments[0].name.value;

    var _buildCypherSelection11 = (0, _selections.buildCypherSelection)({
        initial: '',
        selections: selections,
        variableName: variableName,
        schemaType: schemaType,
        resolveInfo: resolveInfo,
        paramIndex: 1
      }),
      _buildCypherSelection12 = (0, _slicedToArray3.default)(
        _buildCypherSelection11,
        2
      ),
      _subQuery4 = _buildCypherSelection12[0],
      _subParams4 = _buildCypherSelection12[1];

    params = (0, _extends3.default)({}, params, _subParams4);

    // Cannot execute a map projection on a deleted node in Neo4j
    // so the projection is executed and aliased before the delete
    query =
      'MATCH (' +
      variableName +
      ':' +
      typeName +
      ' {' +
      _idParam +
      ': $' +
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value +
      '})\nWITH ' +
      variableName +
      ' AS ' +
      (variableName + '_toDelete') +
      ', ' +
      variableName +
      ' {' +
      _subQuery4 +
      '} AS ' +
      variableName +
      '\nDETACH DELETE ' +
      (variableName + '_toDelete') +
      '\nRETURN ' +
      variableName;
  } else if ((0, _utils.isRemoveMutation)(resolveInfo)) {
    var _mutationMeta = void 0,
      _relationshipNameArg = void 0,
      _fromTypeArg = void 0,
      _toTypeArg = void 0;

    try {
      _mutationMeta = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.directives.find(function(x) {
          return x.name.value === 'MutationMeta';
        });
    } catch (e) {
      throw new Error(
        'Missing required MutationMeta directive on add relationship directive'
      );
    }

    try {
      _relationshipNameArg = _mutationMeta.arguments.find(function(x) {
        return x.name.value === 'relationship';
      });

      _fromTypeArg = _mutationMeta.arguments.find(function(x) {
        return x.name.value === 'from';
      });

      _toTypeArg = _mutationMeta.arguments.find(function(x) {
        return x.name.value === 'to';
      });
    } catch (e) {
      throw new Error(
        'Missing required argument in MutationMeta directive (relationship, from, or to)'
      );
    }
    //TODO: need to handle one-to-one and one-to-many

    var _fromType = _fromTypeArg.value.value,
      _toType = _toTypeArg.value.value,
      _fromVar = (0, _utils.lowFirstLetter)(_fromType),
      _toVar = (0, _utils.lowFirstLetter)(_toType),
      _relationshipName = _relationshipNameArg.value.value,
      _fromParam = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.arguments[0].name.value.substr(
          _fromVar.length
        ),
      _toParam = resolveInfo.schema
        .getMutationType()
        .getFields()
        [resolveInfo.fieldName].astNode.arguments[1].name.value.substr(
          _toVar.length
        );

    var _buildCypherSelection13 = (0, _selections.buildCypherSelection)({
        initial: '',
        selections: selections,
        variableName: variableName,
        schemaType: schemaType,
        resolveInfo: resolveInfo,
        paramIndex: 1
      }),
      _buildCypherSelection14 = (0, _slicedToArray3.default)(
        _buildCypherSelection13,
        2
      ),
      _subQuery5 = _buildCypherSelection14[0],
      _subParams5 = _buildCypherSelection14[1];

    params = (0, _extends3.default)({}, params, _subParams5);

    query =
      'MATCH (' +
      _fromVar +
      ':' +
      _fromType +
      ' {' +
      _fromParam +
      ': $' +
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[0].name.value +
      '})\nMATCH (' +
      _toVar +
      ':' +
      _toType +
      ' {' +
      _toParam +
      ': $' +
      resolveInfo.schema.getMutationType().getFields()[resolveInfo.fieldName]
        .astNode.arguments[1].name.value +
      '})\nOPTIONAL MATCH (' +
      _fromVar +
      ')-[' +
      (_fromVar + _toVar) +
      ':' +
      _relationshipName +
      ']->(' +
      _toVar +
      ')\nDELETE ' +
      (_fromVar + _toVar) +
      '\nRETURN ' +
      _fromVar +
      ' {' +
      _subQuery5 +
      '} AS ' +
      _fromVar +
      ';';
  } else {
    // throw error - don't know how to handle this type of mutation
    throw new Error(
      'Do not know how to handle this type of mutation. Mutation does not follow naming convention.'
    );
  }
  return [query, params];
}

var augmentSchema = (exports.augmentSchema = function augmentSchema(schema) {
  var typeMap = (0, _augmentSchema.extractTypeMapFromSchema)(schema);
  var queryResolvers = (0, _augmentSchema.extractResolvers)(
    schema.getQueryType()
  );
  var mutationResolvers = (0, _augmentSchema.extractResolvers)(
    schema.getMutationType()
  );
  return (0, _augmentSchema.augmentedSchema)(
    typeMap,
    queryResolvers,
    mutationResolvers
  );
});

var makeAugmentedSchema = (exports.makeAugmentedSchema = function makeAugmentedSchema(
  _ref8
) {
  var schema = _ref8.schema,
    typeDefs = _ref8.typeDefs,
    resolvers = _ref8.resolvers,
    logger = _ref8.logger,
    _ref8$allowUndefinedI = _ref8.allowUndefinedInResolve,
    allowUndefinedInResolve =
      _ref8$allowUndefinedI === undefined ? false : _ref8$allowUndefinedI,
    _ref8$resolverValidat = _ref8.resolverValidationOptions,
    resolverValidationOptions =
      _ref8$resolverValidat === undefined ? {} : _ref8$resolverValidat,
    _ref8$directiveResolv = _ref8.directiveResolvers,
    directiveResolvers =
      _ref8$directiveResolv === undefined ? null : _ref8$directiveResolv,
    _ref8$schemaDirective = _ref8.schemaDirectives,
    schemaDirectives =
      _ref8$schemaDirective === undefined ? null : _ref8$schemaDirective,
    _ref8$parseOptions = _ref8.parseOptions,
    parseOptions = _ref8$parseOptions === undefined ? {} : _ref8$parseOptions,
    _ref8$inheritResolver = _ref8.inheritResolversFromInterfaces,
    inheritResolversFromInterfaces =
      _ref8$inheritResolver === undefined ? false : _ref8$inheritResolver;

  if (schema) {
    return augmentSchema(schema);
  }
  if (!typeDefs) throw new Error('Must provide typeDefs');
  return (0, _augmentSchema.makeAugmentedExecutableSchema)({
    typeDefs: typeDefs,
    resolvers: resolvers,
    logger: logger,
    allowUndefinedInResolve: allowUndefinedInResolve,
    resolverValidationOptions: resolverValidationOptions,
    directiveResolvers: directiveResolvers,
    schemaDirectives: schemaDirectives,
    parseOptions: parseOptions,
    inheritResolversFromInterfaces: inheritResolversFromInterfaces
  });
});
