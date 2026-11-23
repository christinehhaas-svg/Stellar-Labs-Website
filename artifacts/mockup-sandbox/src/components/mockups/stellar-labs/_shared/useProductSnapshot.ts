import { useEffect, useRef, useState } from "react";

type InitializeSnapshot = (doc: Document, view: Window) => () => void;
type SnapshotStatus = "loading" | "ready" | "error";

/** Script-disabled frames cannot signal from inside; observe their DOM from the host. */
export function useProductSnapshot(initialize: InitializeSnapshot, revision?: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [status, setStatus] = useState<SnapshotStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setMount(null);
    setStatus("loading");
    const frame = iframeRef.current;
    if (!frame) return;
    let connectedDocument: Document | null = null;
    let disposeSnapshot: (() => void) | undefined;
    let failed = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const stopWaiting = () => {
      clearInterval(poll);
      clearTimeout(deadline);
    };
    const fail = () => {
      failed = true;
      stopWaiting();
      disposeSnapshot?.();
      disposeSnapshot = undefined;
      setMount(null);
      setStatus("error");
    };
    const connect = (finished = false) => {
      if (failed) return;
      try {
        const doc = frame.contentDocument;
        const view = frame.contentWindow;
        // The initial about:blank document is complete but is not our shell.
        if (!doc || !view || doc.URL === "about:blank") return;
        if (connectedDocument === doc) return;
        const target = doc.getElementById("supplements-app-mount");
        if (!target) {
          if (finished) fail();
          return;
        }
        disposeSnapshot?.();
        disposeSnapshot = initialize(doc, view);
        connectedDocument = doc;
        setMount(target);
        setStatus("ready");
        stopWaiting();
      } catch {
        // Covers an inaccessible document or an unexpected initialization failure.
        fail();
      }
    };
    const onLoad = () => connect(true);
    frame.addEventListener("load", onLoad);
    frame.addEventListener("error", fail);
    poll = setInterval(connect, 50);
    deadline = setTimeout(fail, 15_000);
    connect(frame.contentDocument?.readyState === "complete");
    return () => {
      stopWaiting();
      frame.removeEventListener("load", onLoad);
      frame.removeEventListener("error", fail);
      disposeSnapshot?.();
    };
  }, [attempt, initialize, revision]);

  const retry = () => {
    setMount(null);
    setStatus("loading");
    setAttempt((value) => value + 1);
  };
  return { iframeRef, mount, status, attempt, retry };
}
