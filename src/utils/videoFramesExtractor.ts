/**
 * Extracts keyframes and metadata from an uploaded video file on the client side.
 * Converts keyframes into lightweight, optimized JPEG base64 strings so they can be
 * sent to Gemini for recipe identification without exceeding serverless size limits.
 */

export interface ExtractedVideoData {
  fileName: string;
  durationSeconds: number;
  thumbnailUrl: string;
  frames: string[]; // Base64 data URLs (image/jpeg)
}

export async function extractFramesFromVideoFile(
  file: File,
  numFrames: number = 4
): Promise<ExtractedVideoData> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanUp = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onerror = () => {
      cleanUp();
      reject(new Error('No se pudo cargar el archivo de video. Asegúrate de que sea un formato válido (.mp4, .mov, .webm).'));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 10;
        
        // Pick timestamps across the video: beginning, middle steps, end presentation
        const timestamps: number[] = [];
        if (duration <= 3) {
          timestamps.push(duration * 0.5);
        } else {
          for (let i = 1; i <= numFrames; i++) {
            timestamps.push(Math.min(duration - 0.5, (duration * i) / (numFrames + 1)));
          }
        }

        const frames: string[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanUp();
          throw new Error('No se pudo inicializar el procesador de video.');
        }

        // Scale resolution to max 720px for optimal speed and AI recognition
        const maxDimension = 720;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Extract each frame sequentially
        for (const time of timestamps) {
          await new Promise<void>((resSeek) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              try {
                ctx.drawImage(video, 0, 0, width, height);
                // 0.75 quality JPEG gives great clarity for text/ingredients at ~50KB
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                frames.push(dataUrl);
              } catch (e) {
                console.warn('Error drawing frame at', time, e);
              }
              resSeek();
            };
            video.addEventListener('seeked', onSeeked);
            video.currentTime = Math.max(0.1, time);
          });
        }

        cleanUp();

        if (frames.length === 0) {
          throw new Error('No se pudieron extraer fotogramas del video.');
        }

        // Use the last frame or 2nd frame as thumbnail (usually shows plated dish or ingredients)
        const thumb = frames[frames.length - 1] || frames[0];

        resolve({
          fileName: file.name.replace(/\.[^/.]+$/, ''),
          durationSeconds: Math.round(duration),
          thumbnailUrl: thumb,
          frames
        });
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };
  });
}
