export type UUID = string;
export type ISODateString = string;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

/** Money is serialized as string to preserve numeric(19,4) precision (TSA §17) */
export interface Money {
  amount: string;
  currency: string;
}

export interface DateRange {
  from: ISODateString;
  to: ISODateString;
}
