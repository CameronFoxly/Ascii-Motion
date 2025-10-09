declare module 'mp4box' {
  export interface MP4VideoTrack {
    movie_timescale?: number;
    movie_duration?: number;
    nb_samples?: number;
    timescale?: number;
  }

  export interface MP4Info {
    videoTracks?: MP4VideoTrack[];
  }

  export interface MP4File {
    onReady: (info: MP4Info) => void;
    onError: () => void;
    appendBuffer: (buffer: ArrayBuffer & { fileStart?: number }) => void;
    flush: () => void;
  }

  export function createFile(): MP4File;
}
