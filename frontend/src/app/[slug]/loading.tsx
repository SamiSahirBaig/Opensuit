export default function ToolLoading() {
    return (
        <div>
            {/* Hero skeleton */}
            <section className="hero-gradient py-16 sm:py-20">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 mb-6 mx-auto shimmer" />
                    <div className="h-10 w-3/4 mx-auto rounded-lg bg-white/[0.03] shimmer mb-4" />
                    <div className="h-5 w-1/2 mx-auto rounded-lg bg-white/[0.03] shimmer" />
                </div>
            </section>

            {/* Upload zone skeleton */}
            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <div className="upload-zone p-8 sm:p-12">
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03] shimmer" />
                            <div className="h-5 w-48 rounded bg-white/[0.03] shimmer" />
                            <div className="h-4 w-32 rounded bg-white/[0.03] shimmer" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
