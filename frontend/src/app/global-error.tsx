"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    fontFamily: "system-ui, sans-serif",
                    padding: "2rem",
                    textAlign: "center",
                }}>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: "#666", marginBottom: "2rem", maxWidth: "400px" }}>
                        An unexpected error occurred. Our team has been notified and is working on a fix.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: "0.75rem 2rem",
                            backgroundColor: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "0.5rem",
                            cursor: "pointer",
                            fontSize: "1rem",
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
