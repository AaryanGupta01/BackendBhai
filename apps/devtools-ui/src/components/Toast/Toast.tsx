import styles from './Toast.module.css';

interface Props {
  visible: boolean;
  message: string;
}

export function Toast({ visible, message }: Props) {
  return (
    <div className={[styles.toast, visible ? styles.on : ''].join(' ')}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#4ade80" strokeWidth="1.5">
        <polyline points="3,8 7,12 13,4" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
