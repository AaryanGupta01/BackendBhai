export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type LogLevel = 'info' | 'warn' | 'error';
export type TabId = 'wf' | 'ov' | 'logs' | 'db' | 'ext' | 'topo' | 'replay' | 'compare';

export interface Request {
  id: string;
  m: HttpMethod;
  p: string;
  s: number;
  d: number;
  svcs: string[];
  t: string;
  errorCulprit?: string;
  errorMessage?: string;
}

export interface Span {
  id?: string;
  parentId?: string;
  svc: string;
  op: string;
  st: number;
  d: number;
  depth: number;
  err: boolean;
}

export interface LogEntry {
  lv: LogLevel;
  svc: string;
  msg: string;
  ts: string;
}

export interface DbQuery {
  op: string;
  tbl: string;
  d: number;
  sql: string;
}

export interface ExtCall {
  m: HttpMethod;
  url: string;
  s: number;
  d: number;
}

export interface ToastState {
  visible: boolean;
  message: string;
}
