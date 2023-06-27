/**
 * Rust code generator
 */
import * as fs from 'fs'
import { get, keyBy, flatten } from 'lodash'
import { normalizeTypes } from '../utils'
import { TypeDefinition, TypeDefinitionStrict } from '../'
import { Kind } from '../types'
export * from './rust/types'

import { TypeMapping, Options } from './rust/types'
import { getUnion } from './rust/gen/union'
import { getEnum } from './rust/gen/enum'
import { getStruct } from './rust/gen/struct'
import { getAlias } from './rust/gen/alias'
import { smoosh } from './utils'
import { toRustNS, defaultDerives as defaultDerivesConst } from './rust/utils'

let globalBigArraySizes = []

export const defaultOptions = {
  lookupTypes: [[]],
  extras: [],
  defaultDerives: {},
  extraDerives: {},
  meta: {},
  camelCase: false,
  enumConversionError: {
    type: '{{ underlying }}',
    constructor: 'other'
  },
  forEachType: ([generated, _context, _meta]) => generated
}

export const defaultMapping: TypeMapping = {
  'char[]': size => `[u8; ${size}]`,
}

/**
 * Generate Rust types from Bendec types definitions
 */
export const generateString = (
  typesDuck: TypeDefinition[],
  options: Options = defaultOptions
) => {

  globalBigArraySizes = []
  const ignoredTypes = ['char']

  const types: TypeDefinitionStrict[] = normalizeTypes(typesDuck)
  const lookupTypes = normalizeTypes(flatten(options.lookupTypes))
  const lookup = keyBy(types.concat(lookupTypes), i => i.name)

  options = { ...defaultOptions, ...options }

  const { typeMapping, extraDerives = [], meta } = options 
  const typeMap: TypeMapping = { ...defaultMapping, ...typeMapping }
  const defaultDerives = { ...defaultDerivesConst, ...options.defaultDerives }

  const definitions = types.map(typeDef => {
    // This is what we pass into callback function for each type def
    const context = typeDef

    const typeName = typeDef.name

    const typeMeta = meta[typeName]

    const extraDerivesArray = get(extraDerives, typeName, [])

    if (typeMap[typeName]) {
      return [`pub type ${typeName} = ${typeMap[typeName]()};`, context]
    }

    if (ignoredTypes.includes(typeName)) {
      return [`// ignored: ${typeName}`, context]
    }

    if (typeDef.kind === Kind.Primitive) {
      return [`// primitive built-in: ${typeName}`, context]
    }

    if (typeDef.kind === Kind.Alias) {
      return [
        getAlias(
          typeName,
          typeDef.alias,
          typeMeta,
          defaultDerives.newtype,
          extraDerivesArray,
          typeDef.description
        ),
        context
      ]
    }

    if (typeDef.kind === Kind.Union) {
      return [getUnion(typeDef, types), context]
    }

    if (typeDef.kind === Kind.Enum) {
      return [
        getEnum(
          typeDef,
          options.enumConversionError,
          typeMeta,
          defaultDerives,
          extraDerivesArray
        ),
        context
      ]
    }

    if (typeDef.kind === Kind.Struct) {
      return [
        getStruct(
          typeDef,
          lookup,
          typeMap,
          typeMeta,
          defaultDerives.struct,
          extraDerivesArray,
          options.camelCase
        ),
        context
      ]
    }

    if (typeDef.kind === Kind.Array) {
      const alias = `[${toRustNS(typeDef.type)}; ${typeDef.length}]`
      return [
        getAlias(
          typeName,
          alias,
          typeMeta,
          defaultDerives.newtype,
          extraDerivesArray,
          typeDef.description
        ),
        context
      ]
    }
  })

  const result = definitions.map(([generated, context]: [string, TypeDefinitionStrict]) => {
    const typeName = context.name
    const typeMeta = meta[typeName]
    return options.forEachType([generated, context, typeMeta])
  }).join('\n\n')
  const extrasString = options.extras.join('\n')
  const bigArraySizesString = globalBigArraySizes.length > 0
    ? `big_array! { BigArray; ${globalBigArraySizes.join(',')}, }`
    : ''

  return smoosh([
`/** GENERATED BY BENDEC TYPE GENERATOR */
#[allow(unused_imports)]
use serde::{Deserialize, Deserializer, Serialize, Serializer};`,
bigArraySizesString,
extrasString,
result])
}

/**
 * Generate Rust types from Bendec types definitions
 */
export const generate = (types: TypeDefinition[], fileName: string, options?: Options) => {
  const moduleWrapped = generateString(types, options)

  fs.writeFileSync(fileName, moduleWrapped)
  console.log(`WRITTEN: ${fileName}`)
}
