export class CountDown {
  constructor(seconds) {
    this.secondsRemaining = seconds;
    this.updateTime();
  }

  updateTime() {
    this._hours = Math.floor(this.secondsRemaining / 3600);
    this._minutes = Math.floor((this.secondsRemaining % 3600) / 60);
    this._seconds = this.secondsRemaining % 60;
  }

  get hours() {
    return this._hours;
  }

  get minutes() {
    return this._minutes;
  }

  get seconds() {
    return this._seconds;
  }

  start(callback) {
    if (callback) callback(this);

    this.interval = setInterval(() => {
      if (this.secondsRemaining > 0) {
        this.secondsRemaining--;
        this.updateTime();
        if (callback) callback(this);
      } else {
        clearInterval(this.interval);
      }
    }, 1000);
  }

  stop() {
    clearInterval(this.interval);
  }
}
