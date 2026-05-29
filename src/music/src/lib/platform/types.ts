/**
 * 平台策略接口
 * 
 * 封装不同操作系统的差异，提供统一的平台特定操作。
 * 策略模式：每个平台实现此接口，由工厂函数根据当前平台选择。
 */
export interface PlatformStrategy {
  /** 平台名称 */
  readonly name: string;

  /** 可执行文件后缀（Windows: '.exe'，其他: ''） */
  readonly exeSuffix: string;

  /** 安装指引 */
  readonly installHint: string;

  /** 检查进程是否运行 */
  checkProcess(name: string): Promise<boolean>;

  /** 终止进程 */
  killProcess(name: string): Promise<void>;

  /** IPC 通信路径 */
  getIpcPath(name: string): string;

  /** 临时文件路径 */
  getTmpPath(file: string): string;

  /** mise 安装目录 */
  getMiseInstallsDir(): string;

  /** 查找可执行文件的命令和参数 */
  getLocatorCommand(): [string, string[]];
}
