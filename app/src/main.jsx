import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// =======================================================
// Service Worker + Auto Update
// =======================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then((reg) => {
      // Cherche une mise à jour dès l'ouverture
      reg.update().catch(() => {});

      // Vérifie à chaque retour en avant-plan
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) reg.update().catch(() => {});
      });

      // Vérifie toutes les heures
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);

      // Si une nouvelle version est dispo → propose de recharger
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (
            sw.state === "installed" &&
            navigator.serviceWorker.controller // déjà une version active
          ) {
            const ok = confirm("Nouvelle version disponible. Recharger ?");
            if (ok) location.reload();
          }
        });
      });
    }).catch(console.error);
  });
}
