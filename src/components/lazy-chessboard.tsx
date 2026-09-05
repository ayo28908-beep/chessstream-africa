"use client";

// Wrapper that static-imports react-chessboard's named export. Dynamic-importing a
// package's named export through `.then((m) => m.X)` breaks under Turbopack's
// production interop (the loadable shim exposes `.default`, not the namespace),
// which crashed /analyze with React error #130. Importing THIS module dynamically
// and reading `.default` is reliable in both dev and prod.
import { Chessboard } from "react-chessboard";

export default Chessboard;
