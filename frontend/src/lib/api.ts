const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface UploadResponse {
    jobId: string;
    status: string;
    message: string;
}

export interface JobStatusResponse {
    jobId: string;
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress: number;
    downloadToken: string | null;
    message: string;
    originalFileName: string;
}

export async function uploadFile(file: File, endpoint: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
    }

    return res.json();
}

export async function uploadFiles(files: File[], endpoint: string): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
    }

    return res.json();
}

export async function checkJobStatus(jobId: string): Promise<JobStatusResponse> {
    const res = await fetch(`${API_BASE}/api/status/${jobId}`);

    if (!res.ok) {
        throw new Error('Failed to check job status');
    }

    return res.json();
}

export function getDownloadUrl(token: string): string {
    return `${API_BASE}/api/download/${token}`;
}

export async function pollJobStatus(
    jobId: string,
    onUpdate: (status: JobStatusResponse) => void,
    intervalMs: number = 1500
): Promise<JobStatusResponse> {
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                const status = await checkJobStatus(jobId);
                onUpdate(status);

                if (status.status === 'COMPLETED') {
                    resolve(status);
                } else if (status.status === 'FAILED') {
                    reject(new Error(status.message || 'Processing failed'));
                } else {
                    setTimeout(poll, intervalMs);
                }
            } catch (error) {
                reject(error);
            }
        };

        poll();
    });
}
