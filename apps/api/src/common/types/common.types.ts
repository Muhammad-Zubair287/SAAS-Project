export type UUID = string;

export type ISODateString = string;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface Money {
  /** Serialized as string to preserve numeric(19,4) precision (TSA §17) */
  amount: string;
  currency: string;
}

export interface DateRange {
  from: ISODateString;
  to: ISODateString;
}

export type Constructor<T = object> = new (...args: unknown[]) => T;
