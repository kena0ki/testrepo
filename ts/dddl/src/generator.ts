/** Options for data to be generated. */
export type GeneratorOptions = {
  /** Output format. Either csv or insert statement. */
  outputFormat: CsvFormat|InsertStatementFormat,
  /**
   *  Options for each column to determine how they are generated.
   *  The options need to be valid types for corresponding columns.
   *    - Column -                   - Option -
   *    Numeric                   -> NumericColumnOption
   *    Normal character          -> CharColumnOption
   *    Binary character          -> BinaryColumnOption (not yet implemented)
   *    Date, Time, Timestamp     -> DateColumnOption (not yet implemented)
   *  If you want a fixed value for some columns throughout entire data,
   *  you can specify the value using FixedValue.
   */
  columnOptions?: IntegerColumnOption[],
  /**
   *  
   */
  columnOptionsDefault?: IntegerColumnOption[],
  /** A function to manipulate row data after it's generated. */
  eachRow?: (rowCount: number, columns: string[], prev: object) => string,
  /** The number of rows to be generated. */
  rows: number,
  /**
   * How to behave when invalid data is detected. Default: log.
   *   log: continue, but output log.
   *   abort: abort data generation.
   *   ignore: ignore error data and going on.
   */
  errorAction: 'log'|'abort'|'ignore',
}
/** CsvFormat is used for GeneratorOptions.outputFormat */
export class CsvFormat {
  /** Delimiter of each column. Default: ',' */
  public delimiter?: string = `,`
  /** Quote for each value. Default: '"' */
  public quote?: string = `"`
  /** Escape sequence. Default: '"' */
  public escapeSequence?: string = `"`
  /** Define options */
  public define(obj: OnlyOfType<string|number,CsvFormat>): this {
    (Object.keys(obj) as [keyof CsvFormat]).forEach(key => {
      if (isOfTypeNumber<CsvFormat>(key)) this[key] = obj[key];
      if (isOfTypeString<CsvFormat>(key)) this[key] = obj[key];
    });
    return this;
  }
}
/** InsertStatementFormat is used for GeneratorOptions.outputFormat */
export class InsertStatementFormat {
}
/** NumericColumnOptions is used for GeneratorOptions.columnOptions */
export class IntegerColumnOption {
  /** How much advance per each row. Default: 1 for integers, 0.1 for decimals */
  public stepBy?: number
  /** Value of the first row */
  public initialValue?: number = 1
  /** Prefix. Default: nothing */
  public prefix: Prefix = ''
  /** Limit of incrementation. Default: depend on the corresponding column data type. */
  public limit?: number = Infinity
  /**
   * How to behave when incrementation hits the limit. Default: loop.
   *   loop: back to the initial value and continue to increment
   *   negate: negate the value and continue to increment
   *   keep: stop incrementation and keep the limit value
   */
  public loop?: 'loop'|'negate'|'keep' = 'loop'
}
/** CharColumnOptions is used for GeneratorOptions.columnOptions */
export class CharColumnOption {
  /** Limit of incrementation. Default: depend on the corresponding column data type. */
  public maxLength: number = Infinity
  /** Prefix. Default: column number */
  public prefix: Prefix = ''
  /** Suffix. Default: nothing */
  public suffix: Prefix = ''
  /**
   * How to behave when incrementation hits the limit. Default: loop.
   *   loop: back to the initial value and continue to increment
   *   keep: stop incrementation and keep the limit value
   */
  public loop?: 'loop'|'keep' = 'loop'
}
/** BinaryColumnOptions is used for GeneratorOptions.columnOptions */
export class BinaryColumnOptions {
  // TODO
}
/** DateColumnOptions is used for GeneratorOptions.columnOptions */
export class DateColumnOptions {
  // TODO
}
/** FixedValue is use for GeneratorOptions.columnOptions */
export class FixedValue {
  constructor(
    /** The value to be set to a column */
    public value: string = '',
  ) {}
}
type OnlyKeysOfType<T,O> = Extract<keyof O, {[K in keyof O]: O[K] extends T|undefined ? K : never}[keyof O]>
type OnlyOfType<T,O> = {[K in OnlyKeysOfType<T,O>]?: O[K]};
function isOfTypeNumber<K>(key: keyof K): key is OnlyKeysOfType<number,K> { return typeof key === 'number'; }
function isOfTypeString<K>(key: keyof K): key is OnlyKeysOfType<string,K> { return typeof key === 'string'; }
type Prefix = string|((row: number, col: number, colName: string) => string);

/**
 * Generates data from a create table statement with options.
 * How data is generated depends on types and options but the general idea is simple.
 * Generator adds 1 to previous data row by row so each column would have sequentially incremented number.
 * Given that we have the following ddl,
 *    create table a (
 *      col1 char(5),
 *      col2 integer,
 *      col3 float,
 *      col1 char(8)
 *    );
 * then we get the following.
 *    L1  "a0001","1","0.1","b0000001"
 *    L2  "a0002","2","0.2","b0000002"
 *    L3  "a0003","3","0.3","b0000003"
 *    L4  "a0004","4","0.4","b0000004"
 */
export const generate = (ddl: string, options: GeneratorOptions) => {
};

