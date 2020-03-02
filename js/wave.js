class Wave {
    current_stream = {};
    sources = {};
    onFileLoad;

    constructor() {}

    findSize(size) {

        for (var range = 1; range <= 40; range++) {
            var power = 2 ** range;

            if (size <= power) return power;
        }

    }

    //colors,stroke,wave,skirt,sun,ring,bars,dualbars,matrix,flower,vortex,flower_blocks,bars_blocks,star,wings,round_wave,dualbars_blocks
    //shine,orbs
    visualize(data, canvas, options = {}) {
        //options
        if (!options.stroke) options.stroke = 2;
        if (!options.colors) options.colors = ["rgb(255, 53, 94)"];

        var c;
        if (typeof canvas == "string") {
            c = document.getElementById(canvas);
        } else {
            c = canvas;
        }

        var ctx = c.getContext("2d");

        var h = c.height;
        var w = c.width;

        var totalLine = 10;


        //clear canvas
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();

        ctx.strokeStyle = options.colors[0];
        ctx.lineWidth = options.stroke;

        if (options.dualbars) {
            var percent = h / 1000;
            var increase = w / (totalLine + 1);
            var point_count = totalLine;
            var min = 1;
            var breakpoint = Math.floor(point_count / options.colors.length);

            for (var point = 1; point <= point_count; point++) {
                p = data[point]; //get value
                p += min;
                p *= percent;

                var x = increase * point;

                var mid = (h / 2) + (p / 2);

                ctx.moveTo(x, mid);
                ctx.lineTo(x, mid - p);
                ctx.lineWidth = 8
                ctx.lineCap = "round"

                if (point % breakpoint == 0) {
                    var i = (point / breakpoint) - 1;
                    ctx.strokeStyle = options.colors[i];
                    ctx.stroke();
                    ctx.beginPath();
                }

            }

        }

        if (options.flower) {
            var min = 100;
            var r = h / 4;
            var offset = r / 2;
            var cx = w / 2;
            var cy = h / 2;
            var point_count = 128;
            var percent = (r - offset) / 255;
            var increase = (360 / point_count) * Math.PI / 180;
            var breakpoint = Math.floor(point_count / options.colors.length);

            for (var point = 1; point <= point_count; point++) {
                var p = (data[point] + min) * percent;
                var a = point * increase;

                var sx = cx + (r - (p - offset)) * Math.cos(a);
                var sy = cy + (r - (p - offset)) * Math.sin(a);
                ctx.moveTo(sx, sy);

                var dx = cx + (r + p) * Math.cos(a);
                var dy = cy + (r + p) * Math.sin(a);
                ctx.lineTo(dx, dy);

                if (point % breakpoint == 0) {
                    var i = (point / breakpoint) - 1;
                    ctx.strokeStyle = options.colors[i];
                    ctx.stroke();
                    ctx.beginPath();
                }
            }

            ctx.stroke();
        }
    }

    fromFile(file, options = {}) {
        //options
        if (!options.stroke) options.stroke = 10;

        var audio = new Audio();
        audio.src = file;

        var audioCtx = new AudioContext();
        var analyser = audioCtx.createAnalyser();

        var source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);

        analyser.fftSize = 64;
        var bufferLength = analyser.frequencyBinCount;

        var file_data;
        var temp_data = new Uint8Array(bufferLength);
        var getWave;
        var fdi = 0;
        var self = this;

        audio.addEventListener('loadedmetadata', async function () {

            while (audio.duration === Infinity) {
                await new Promise(r => setTimeout(r, 1000));
                audio.currentTime = 10000000 * Math.random();
            }

            audio.currentTime = 0;
            audio.play();
        })

        audio.onplay = function () {
            var d = audio.duration;
            audio.playbackRate = 16;

            d = d / audio.playbackRate;

            var drawRate = 20; //ms

            var size = ((d / (drawRate / 1000)) * (analyser.fftSize / 2));
            size = self.findSize(size);
            file_data = new Uint8Array(size);


            getWave = setInterval(function () {
                analyser.getByteFrequencyData(temp_data);

                for (var data in temp_data) {
                    data = temp_data[data];
                    file_data[fdi] = data;
                    fdi++;
                }

            }, drawRate);


        }

        audio.onended = function () {

            if (audio.currentTime == audio.duration && file_data != undefined) {

                clearInterval(getWave);

                var canvas = document.createElement("canvas");
                canvas.height = window.innerHeight;
                canvas.width = window.innerWidth;

                self.visualize(file_data, canvas, options);

                //var p = document.getElementById(canvas_id);
                var image = canvas.toDataURL("image/jpg");
                self.onFileLoad(image);

                canvas.remove();
            }

        }

    }

    fromStream(stream, canvas_id, options = {}, muted = true) {

        this.current_stream.id = canvas_id;
        this.current_stream.options = options;

        var audioCtx, analyser, source;
        if (!this.sources[stream.toString()]) {
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();

            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            source.connect(audioCtx.destination); //playback audio

            this.sources[e.toString()] = {
                "audioCtx": audioCtx,
                "analyser": analyser,
                "source": source
            }
        } else {
            cancelAnimationFrame(this.sources[stream.toString()].animation);
            audioCtx = this.sources[stream.toString()].audioCtx;
            analyser = this.sources[stream.toString()].analyser;
            source = this.sources[stream.toString()].source;
        }

        if (!muted) source.connect(audioCtx.destination); //playback audio

        analyser.fftSize = 512;
        if (options.ring || options.round_wave || options.flower_blocks || options.bars || options.bars_blocks) analyser.fftSize = 1024;
        if (options.wave || options.dualbars || options.orbs || options.flower) analyser.fftSize = 2048;
        if (options.star || options.shine) analyser.fftSize = 4096;


        var bufferLength = analyser.frequencyBinCount;
        this.current_stream.data = new Uint8Array(bufferLength);

        var frame_count = 1;
        var c = 1;
        var self = this;

        function renderFrame() {
            self.current_stream.animation = requestAnimationFrame(self.current_stream.loop);
            self.sources[stream.toString()]["animation"] = self.current_stream.animation;
            analyser.getByteFrequencyData(self.current_stream.data);


            c++;
            if (c % frame_count == 0) { //every * frame
                self.visualize(self.current_stream.data, self.current_stream.id, self.current_stream.options);
            }

        }

        this.current_stream.loop = renderFrame;
        renderFrame();

    }

    stopStream() {
        cancelAnimationFrame(this.current_stream.animation);
    }

    playStream() {
        this.current_stream.loop();
    }

    fromElement(e, canvas_id, options) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }


        var audioCtx, analyser, source;
        if (!this.sources[e.toString()]) {
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();

            source = audioCtx.createMediaElementSource(e);
            source.connect(analyser);
            source.connect(audioCtx.destination); //playback audio

            this.sources[e.toString()] = {
                "audioCtx": audioCtx,
                "analyser": analyser,
                "source": source
            }
        } else {
            cancelAnimationFrame(this.sources[e.toString()].animation);
            audioCtx = this.sources[e.toString()].audioCtx;
            analyser = this.sources[e.toString()].analyser;
            source = this.sources[e.toString()].source;
        }


        analyser.fftSize = 512;
        if (options.ring || options.round_wave || options.flower_blocks || options.bars || options.bars_blocks) analyser.fftSize = 1024;
        if (options.wave || options.dualbars || options.orbs || options.flower) analyser.fftSize = 2048;
        if (options.star || options.shine) analyser.fftSize = 4096;

        var bufferLength = analyser.frequencyBinCount;
        var data = new Uint8Array(bufferLength);
        var frame_count = 1;
        var c = 1;

        var animation;
        var self = this;


        function renderFrame() {
            animation = requestAnimationFrame(renderFrame);
            analyser.getByteFrequencyData(data);
            self.sources[e.toString()]["animation"] = animation;

            c++;
            if (c % frame_count == 0) { //every * frame
                self.visualize(data, canvas_id, options);
            }
        }

        e.onplay = function () {
            audioCtx.resume();
            renderFrame();
        }

        e.onended = function () {
            cancelAnimationFrame(animation);
        }


    }

}
