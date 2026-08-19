import { UnitorBrand } from "@/components/UnitorBrand";
import Link from "next/link";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-unitor-background text-unitor-black">
            {/* Header */}
            <header className="border-b border-unitor-gray-light bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link
                        href="/"
                        className="text-2xl font-bold text-unitor-primary"
                    >
                        <UnitorBrand label="Unitor" />
                    </Link>

                    <nav className="hidden items-center gap-6 md:flex">
                        <a
                            href="#how-it-works"
                            className="text-sm font-medium text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            How it works
                        </a>

                        <a
                            href="#features"
                            className="text-sm font-medium text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            Features
                        </a>

                        <a
                            href="#about"
                            className="text-sm font-medium text-unitor-gray-dark hover:text-unitor-primary"
                        >
                            About
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="rounded-lg border border-unitor-gray-light bg-white px-4 py-2 text-sm font-medium text-unitor-gray-dark hover:bg-unitor-background"
                        >
                            Log in
                        </Link>

                        <Link
                            href="/signup"
                            className="rounded-lg bg-unitor-primary px-4 py-2 text-sm font-medium text-white hover:bg-unitor-primary-hover"
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
                        <h1 className="max-w-2xl text-4xl font-bold leading-tight text-unitor-black sm:text-5xl lg:text-6xl">
                            Get academic help from students who understand your
                            course.
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-8 text-unitor-gray-dark">
                            Unitor connects university students with experienced
                            peer tutors for course-specific guidance, exam
                            preparation, problem solving, and academic support.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/signup"
                                className="rounded-xl bg-unitor-primary px-6 py-3 text-center font-medium text-white hover:bg-unitor-primary-hover"
                            >
                                Get started
                            </Link>

                            <Link
                                href="/login"
                                className="rounded-xl border border-unitor-gray-light bg-white px-6 py-3 text-center font-medium text-unitor-gray-dark hover:bg-unitor-gray-soft"
                            >
                                Log in
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-6 text-sm text-unitor-gray-dark">
                            <span>✓ Course-specific support</span>
                            <span>✓ Peer tutors</span>
                            <span>✓ Secure chat</span>
                        </div>
                    </div>

                    {/* Hero Card */}
                    <div className="rounded-3xl bg-white p-6 shadow-lg sm:p-8">
                        <div className="rounded-2xl bg-unitor-primary p-6 text-white">
                            <p className="text-sm font-medium text-unitor-blue-light">
                                Example student request
                            </p>

                            <h2 className="mt-3 text-2xl font-bold">
                                Need help with CSE course preparation?
                            </h2>

                            <p className="mt-3 leading-7 text-unitor-background">
                                Create a proposal, receive tutor applications,
                                select a suitable tutor, complete payment, and
                                start your tutoring session.
                            </p>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="rounded-xl border border-unitor-gray-light p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                    Course
                                </p>
                                <p className="mt-1 font-medium text-unitor-black">
                                    CSE / EEE / BBA / ENG and more
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-xl bg-unitor-background p-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                        Support
                                    </p>
                                    <p className="mt-1 font-medium text-unitor-black">
                                        Peer learning
                                    </p>
                                </div>

                                <div className="rounded-xl bg-unitor-background p-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-unitor-gray-dark/70">
                                        Availability
                                    </p>
                                    <p className="mt-1 font-medium text-unitor-black">
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
                className="border-y border-unitor-gray-light bg-white px-6 py-20"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-medium uppercase tracking-wide text-unitor-primary">
                            Simple process
                        </p>

                        <h2 className="mt-3 text-3xl font-bold text-unitor-black">
                            How Unitor works
                        </h2>

                        <p className="mt-4 text-unitor-gray-dark">
                            Students can find academic support in a few simple
                            steps.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-unitor-gray-light p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary-hover">
                                1
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Create a proposal
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
                                Describe the course, topic, schedule, and support
                                you need.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-unitor-gray-light p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary-hover">
                                2
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Receive applications
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
                                Tutors who can help with the course can apply to
                                your proposal.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-unitor-gray-light p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary-hover">
                                3
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Confirm payment
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
                                Select a tutor and complete the payment
                                verification process.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-unitor-gray-light p-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-unitor-blue-light font-bold text-unitor-primary-hover">
                                4
                            </div>

                            <h3 className="mt-5 text-lg font-bold">
                                Start learning
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
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
                        <p className="text-sm font-medium uppercase tracking-wide text-unitor-primary">
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
                className="border-y border-unitor-gray-light bg-white px-6 py-20"
            >
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-unitor-primary">
                            About Unitor
                        </p>

                        <h2 className="mt-3 text-3xl font-bold text-unitor-black">
                            Students helping students learn better.
                        </h2>
                    </div>

                    <div className="space-y-4 leading-7 text-unitor-gray-dark">
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
                <div className="mx-auto max-w-5xl rounded-3xl bg-unitor-primary px-6 py-12 text-center text-white sm:px-10">
                    <h2 className="text-3xl font-bold">
                        Ready to get academic support?
                    </h2>

                    <p className="mx-auto mt-4 max-w-2xl leading-7 text-unitor-background">
                        Create your Unitor account and connect with peer tutors
                        for course-specific guidance.
                    </p>

                    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            href="/signup"
                            className="rounded-xl bg-white px-6 py-3 font-medium text-unitor-primary-hover hover:bg-unitor-background"
                        >
                            Create account
                        </Link>

                        <Link
                            href="/login"
                            className="rounded-xl border border-unitor-blue-light px-6 py-3 font-medium text-white hover:bg-unitor-primary-hover"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-unitor-gray-light bg-white px-6 py-10">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Link
                            href="/"
                            className="text-xl font-bold text-unitor-primary"
                        >
                            <UnitorBrand label="Unitor" />
                        </Link>

                        <p className="mt-2 text-sm text-unitor-gray-dark">
                            Peer-to-peer academic support platform.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-5 text-sm text-unitor-gray-dark">
                        <Link
                            href="/login"
                            className="hover:text-unitor-primary"
                        >
                            Login
                        </Link>

                        <Link
                            href="/signup"
                            className="hover:text-unitor-primary"
                        >
                            Sign up
                        </Link>

                        <Link
                            href="/admin/login"
                            className="hover:text-unitor-primary"
                        >
                            Admin
                        </Link>
                    </div>
                </div>

                <div className="mx-auto mt-8 max-w-7xl border-t border-unitor-gray-light pt-6">
                    <p className="text-sm text-unitor-gray-dark">
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-unitor-blue-light text-xl text-unitor-primary-hover">
                ✓
            </div>

            <h3 className="mt-5 text-lg font-bold text-unitor-black">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-unitor-gray-dark">
                {description}
            </p>
        </div>
    );
}
