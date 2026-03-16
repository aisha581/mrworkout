import { Metadata } from 'next';
import RepairModule from '@/components/RepairModule';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ issue: string }>;
}

const INJURY_DATA: Record<string, any> = {
    ankle: {
        title: "3D Ankle Protocol",
        description: "Repair kinetic leaks in the ankle joint. Optimize dorsiflexion and regain explosive elastic recoil for elite sprinting.",
        accentColor: "#00ffff",
        stats: [
            { label: "Stability", value: "+40%" },
            { label: "ROM", value: "25°+" },
            { label: "Injury Risk", value: "-60%" },
            { label: "Elasticity", value: "MAX" }
        ]
    },
    knee: {
        title: "Force Shield Knee",
        description: "Shield your knees from shear force. We re-program your 3D loading patterns to eliminate 'jumper's knee' and enhance deceleration.",
        accentColor: "#39ff14",
        stats: [
            { label: "Decel Power", value: "+35%" },
            { label: "Joint Health", value: "A+" },
            { label: "Impact Abs.", value: "95%" },
            { label: "Structural", value: "LOCK" }
        ]
    },
    hip: {
        title: "Pelvic Power Hub",
        description: "Unlock internal rotation and pelvic clarity. The engine of your 3D movement starts here. Fix the hinge, build the power.",
        accentColor: "#f700ff",
        stats: [
            { label: "Torque", value: "UNLIMITED" },
            { label: "Rotation", value: "Full 3D" },
            { label: "Glute Int.", value: "98%" },
            { label: "Core Sync", value: "SYNC" }
        ]
    },
    shoulder: {
        title: "Rotator Recall",
        description: "Regain athletic shoulder mobility without sacrificing bench press power. Bulletproof your scaps for any vertical challenge.",
        accentColor: "#0000ff",
        stats: [
            { label: "OH Mob.", value: "+45%" },
            { label: "Scap Fix", value: "100%" },
            { label: "Push Force", value: "+15%" },
            { label: "Stability", value: "MAX" }
        ]
    }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { issue } = await params;
    const data = INJURY_DATA[issue.toLowerCase()];
    
    if (!data) return { title: "Repair Hub | Mr. Workout" };

    return {
        title: `${data.title} | MR. WORKOUT`,
        description: data.description,
        openGraph: {
            images: [`/api/og?title=${encodeURIComponent(data.title)}&color=${encodeURIComponent(data.accentColor)}`],
        }
    };
}

export default async function RepairPage({ params }: Props) {
    const { issue } = await params;
    const data = INJURY_DATA[issue.toLowerCase()];

    if (!data) {
        notFound();
    }

    return (
        <RepairModule 
            issue={issue}
            title={data.title}
            description={data.description}
            accentColor={data.accentColor}
            stats={data.stats}
        />
    );
}
