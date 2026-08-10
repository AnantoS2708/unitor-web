import Link from "next/link";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link
                        href="/"
                        className="text-2xl font-bold text-emerald-600"
                    >
                        Unitor
                    </Link>

                    <nav className="hidden items-center gap-6 md:flex">
                        <a
                            href="#how-it-works"
                            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
                        >
                            How it works
                        </a>

                        <a
                            href="#features"
                            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
                        >
                            Features
                        </a>

                        <a
                            href="#about"
                            className="text-sm font-medium text-slate-600 hover:text-emerald-600"
                        >
                            About
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Log in
                        </Link>

                        <Link
                            href="/signup"
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="px-6 py-20 sm:py-24">
                <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
                    <div>
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                            Peer-to-peer academic support
                        </span>

                        <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            Get academic help from students who understand your
                            course.
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                            Unitor connects university students with experienced
                            peer tutors for course-specific guidance, exam
                            preparation, problem solving, and academic support.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/signup"
                                className="rounded-xl bg-emerald-600 px-6 py-3 text-center font-semibold text-white hover:bg-emerald-700"
                            >
                                Get started
                            </Link>

                            <Link
                                href="/login"
                                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 hover:bg-slate-100"
                            >
                                Log in
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-500">
                            <span>✓ Course-specific support</span>
                            <span>✓ Peer tutors</span>
                            <span>✓ Secure chat</span>
                        </div>
                    </div>

                    {/* Hero Card */}
                    <div className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
                        <div className="rounded-2xl bg-emerald-600 p-6 text-white">
                            <p className="text-sm font-medium text-emerald-100">
                                Example student request
                            </p>

                            <h2 className="mt-3 text-2xl font-bold">
                                Need help with CSE course preparation?
                            </h2>

                            <p className="mt-3 leading-7 text-emerald-50">
                                Create a proposal, receive tutor applications,
                                select a suitable tutor, complete payment, and
                                start your tutoring session.
                            </p>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Course
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                    CSE / EEE / BBA / ENG and more
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Support
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        Peer learning
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Availability
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-800">
                                        Flexible sessions
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section
                id="how-it-works"
                className="border-y border-slate-200 bg-white px-6 py-20"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                            Simple process
                        </p>

                        <h2 className="mt-3 text-3xl font-bold text-slate-900">
                            How Unitor works
                        </h2>

                        <p className="mt-4 text-slate-600">
                            Students can find academic support in a few simple
                            steps.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-slate-200 p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                                1
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Create a proposal
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Describe the course, topic, schedule, and support
                                you need.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                                2
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Receive applications
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Tutors who can help with the course can apply to
                                your proposal.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                                3
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Confirm payment
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Select a tutor and complete the payment
                                verification process.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                                4
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Start learning
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Once approved, the student and tutor can use the
                                private chat session.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <div className="max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                            Platform features
                        </p>

                        <h2 className="mt-3 text-3xl font-bold">
                            Built for academic support
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            title="Course-specific tutors"
                            description="Find peer tutors with experience in the courses you need help with."
                        />

                        <FeatureCard
                            title="Proposal system"
                            description="Students can post academic support requests with course, schedule, and budget details."
                        />

                        <FeatureCard
                            title="Secure tutoring chat"
                            description="Approved payments activate a private chat between the selected student and tutor."
                        />

                        <FeatureCard
                            title="Tutor applications"
                            description="Tutors can discover suitable proposals and submit applications to help students."
                        />

                        <FeatureCard
                            title="Reviews and ratings"
                            description="Students can review tutors after a tutoring session is completed."
                        />

                        <FeatureCard
                            title="Tutor earnings"
                            description="Tutors can track earnings and submit withdrawal requests through the platform."
                        />
                    </div>
                </div>
            </section>

            {/* About */}
            <section
                id="about"
                className="border-y border-slate-200 bg-white px-6 py-20"
            >
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                            About Unitor
                        </p>

                        <h2 className="mt-3 text-3xl font-bold text-slate-900">
                            Students helping students learn better.
                        </h2>
                    </div>

                    <div className="space-y-4 leading-7 text-slate-600">
                        <p>
                            Unitor is a peer-to-peer academic support platform
                            designed to connect students who need guidance with
                            other students who have experience in the relevant
                            course.
                        </p>

                        <p>
                            The platform is intended for mentoring, concept
                            clarification, course guidance, exam preparation,
                            and problem-solving support.
                        </p>

                        <p>
                            Unitor is not intended for cheating, completing
                            graded assignments on behalf of students, or
                            participating in academic misconduct.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="px-6 py-20">
                <div className="mx-auto max-w-5xl rounded-3xl bg-emerald-600 px-6 py-12 text-center text-white sm:px-10">
                    <h2 className="text-3xl font-bold">
                        Ready to get academic support?
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-emerald-50">
                        Create your Unitor account and connect with peer tutors
                        for course-specific guidance.
                    </p>

                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            href="/signup"
                            className="rounded-xl bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                            Create account
                        </Link>

                        <Link
                            href="/login"
                            className="rounded-xl border border-emerald-300 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white px-6 py-10">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/"
                            className="text-xl font-bold text-emerald-600"
                        >
                            Unitor
                        </Link>

                        <p className="mt-2 text-sm text-slate-500">
                            Peer-to-peer academic support platform.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-5 text-sm text-slate-600">
                        <Link
                            href="/login"
                            className="hover:text-emerald-600"
                        >
                            Login
                        </Link>

                        <Link
                            href="/signup"
                            className="hover:text-emerald-600"
                        >
                            Sign up
                        </Link>

                        <Link
                            href="/admin/login"
                            className="hover:text-emerald-600"
                        >
                            Admin
                        </Link>
                    </div>
                </div>

                <div className="mx-auto mt-8 max-w-7xl border-t border-slate-200 pt-6">
                    <p className="text-sm text-slate-500">
                        © 2026 Unitor. All rights reserved.
                    </p>
                </div>
            </footer>
        </main>
    );
}

function FeatureCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-xl text-emerald-700">
                ✓
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-900">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
            </p>
        </div>
    );
}