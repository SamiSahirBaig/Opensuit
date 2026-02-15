import Link from "next/link";
import { FileQuestion, Home, ArrowRight } from "lucide-react";

export default function NotFound() {
    return (
        <div className="hero-gradient min-h-[70vh] flex items-center justify-center">
            <div className="text-center px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-8">
                    <FileQuestion className="h-10 w-10 text-indigo-400" />
                </div>

                <h1 className="text-6xl sm:text-8xl font-extrabold tracking-tight mb-4">
                    <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                        404
                    </span>
                </h1>

                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                    Page Not Found
                </h2>

                <p className="text-gray-400 mb-10 max-w-md mx-auto">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    Let&apos;s get you back on track.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/" className="btn-primary inline-flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Go Home
                    </Link>
                    <Link href="/#tools" className="btn-secondary inline-flex items-center gap-2">
                        Browse All Tools
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
