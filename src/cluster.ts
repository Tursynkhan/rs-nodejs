import 'dotenv/config';
import cluster from 'cluster';
import { availableParallelism } from 'os';
import http from 'http';
import { buildApp } from './app';

const PORT = parseInt(process.env.PORT || '4000', 10);
const NUM_WORKERS = availableParallelism() - 1 || 1;

if (cluster.isPrimary) {
  console.log(`Primary process ${process.pid} starting ${NUM_WORKERS} workers...`);

  const sharedDb: Record<string, unknown> = {};

  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = cluster.fork({ WORKER_PORT: PORT + 1 + i });

    worker.on('message', (msg: { type: string; payload: unknown }) => {
      if (msg.type === 'DB_SYNC') {
        Object.assign(sharedDb, msg.payload as Record<string, unknown>);
        for (const id in cluster.workers) {
          cluster.workers[id]?.send({ type: 'DB_UPDATE', payload: sharedDb });
        }
      }
    });
  }

  let currentWorker = 0;
  const workerPorts = Array.from({ length: NUM_WORKERS }, (_, i) => PORT + 1 + i);

  const loadBalancer = http.createServer((req, res) => {
    const targetPort = workerPorts[currentWorker % NUM_WORKERS];
    currentWorker = (currentWorker + 1) % NUM_WORKERS;

    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxy = http.request(options, (workerRes) => {
      res.writeHead(workerRes.statusCode || 200, workerRes.headers);
      workerRes.pipe(res);
    });

    proxy.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(502);
      res.end('Bad Gateway');
    });

    req.pipe(proxy);
  });

  loadBalancer.listen(PORT, () => {
    console.log(`Load balancer running on http://localhost:${PORT}`);
    console.log(`Workers listening on ports: ${workerPorts.join(', ')}`);
  });

  cluster.on('exit', (worker, code) => {
    console.warn(`Worker ${worker.process.pid} exited with code ${code}. Restarting...`);
    cluster.fork();
  });
} else {
  const workerPort = parseInt(process.env.WORKER_PORT || String(PORT + 1), 10);
  const app = buildApp();

  app.listen({ port: workerPort, host: '0.0.0.0' }).then(() => {
    console.log(`Worker ${process.pid} listening on port ${workerPort}`);
  });
}
