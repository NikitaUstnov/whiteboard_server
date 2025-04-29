import cluster from "cluster";
import { cpus } from "os";
import http from "http";
import { setupMaster } from "@socket.io/sticky";
import { setupPrimary } from "@socket.io/cluster-adapter";
import config from "./config";
import HttpServer from "./http/server";

const numCPUs = cpus().length;

export const clusterize = (callback: Function): void => {
  if (cluster.isPrimary) {
    console.log(`Master ${process.pid} is running`);

    // Создаем HTTP сервер для кластеризации
    // Используем временный сервер только для настройки кластера
    const masterServer = http.createServer();

    // Настраиваем sticky sessions для Socket.IO
    setupMaster(masterServer, {
      loadBalancingMethod: "least-connection", // Распределение по наименьшему количеству соединений
    });

    // Настраиваем адаптер кластера
    setupPrimary();

    // Запускаем HTTP сервер мастера на нужном порту
    masterServer.listen(config.server.port, config.server.host, () => {
      console.log(
        `Master listening on http://${config.server.host}:${config.server.port}`
      );
      console.log(`Spawning ${numCPUs} workers...`);
    });

    // Форк workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    // Обработка завершения работы workers
    cluster.on("exit", (worker) => {
      console.log(`Worker ${worker.process.pid} died`);
      cluster.fork();
    });

    // Обработка сигналов завершения для главного процесса
    process.on("SIGINT", () => {
      console.log("Master process shutting down...");

      // Останавливаем все воркеры
      for (const id in cluster.workers) {
        cluster.workers[id]?.kill("SIGTERM");
      }

      // Закрываем серверы
      masterServer.close(() => {
        console.log("Master HTTP server closed");
        process.exit(0);
      });

      // Форсированное завершение через 5 секунд
      setTimeout(() => {
        console.log("Forcing master shutdown after timeout");
        process.exit(1);
      }, 5000);
    });
  } else {
    console.log(`Worker ${process.pid} started`);
    callback();
  }
};
