import { useEffect, useState } from "react";
import { socket } from "./socket";
import { api } from "./api";

export function useLiveState() {
  const [state, setState] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.getState().then((s) => mounted && setState(s)).catch(() => {});

    function onUpdate(s) {
      if (mounted) setState(s);
    }
    socket.on("state:update", onUpdate);
    return () => {
      mounted = false;
      socket.off("state:update", onUpdate);
    };
  }, []);

  return state;
}
