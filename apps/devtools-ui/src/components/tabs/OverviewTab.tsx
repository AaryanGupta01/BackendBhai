import styles from './OverviewTab.module.css';

export function OverviewTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.col}>
        <div className={styles.title}>Request</div>
        <div className="kv">
          <div className="kk">method</div><div className="kv-val grn">POST</div>
          <div className="kk">url</div><div className="kv-val blu">/api/orders</div>
          <div className="kk">content-type</div><div className="kv-val">application/json</div>
          <div className="kk">authorization</div><div className="kv-val red">**REDACTED**</div>
        </div>
        <pre className={styles.jsonBlock}>
          {`{"userId":"user-42","items":[{"id":"item-1","qty":3},{"id":"item-2","qty":1}],"sessionId":"sess-789"}`}
        </pre>
      </div>

      <div className={styles.col}>
        <div className={styles.title}>Response</div>
        <div className="kv">
          <div className="kk">status</div><div className="kv-val red">500 Internal Server Error</div>
          <div className="kk">duration</div><div className="kv-val red">5012ms</div>
          <div className="kk">content-type</div><div className="kv-val">application/json</div>
        </div>
        <pre className={`${styles.jsonBlock} ${styles.jsonErr}`}>
          {`{"error":"Payment service unavailable","code":"PAYMENT_503","traceId":"5b8efff7..."}`}
        </pre>
      </div>
    </div>
  );
}
