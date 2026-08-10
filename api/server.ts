/**
 * local server entry file, for local development
 */
import app from './app.js';

/**
 * start server with port
 */
const PORT = Number(process.env.PORT) || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

// 处理端口占用错误，提供清晰提示
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n========================================`);
    console.error(`[错误] 端口 ${PORT} 已被占用！`);
    console.error(`可能原因：上一个服务器进程未被正确关闭`);
    console.error(`解决方法：`);
    console.error(`  1. Windows: 运行 netstat -ano | findstr :${PORT}`);
    console.error(`  2. 找到占用进程的PID后: taskkill /PID <PID> /F`);
    console.error(`  3. 然后重新运行 npm run dev`);
    console.error(`========================================\n`);
  } else {
    console.error('服务器错误:', error);
  }
  process.exit(1);
});

/**
 * close server - 处理 nodemon 重启信号
 */
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} signal received, closing server...`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

// nodemon 发送 SIGUSR2 信号进行重启
process.on('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2');
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

export default app;