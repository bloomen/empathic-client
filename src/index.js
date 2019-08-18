import React from 'react';
import ReactDOM from 'react-dom';
import uuid from "uuid";
import './index.css';

function Square(props) {
  return (
    <div className="square" 
      onMouseDown={props.onPress} 
      onMouseUp={props.onRelease} 
      onTouchStart={props.onTouchStart}
      onTouchEnd={props.onTouchEnd}
      style={{position: "fixed", left: 0, top: 0, width: props.width, height: props.height}}
    >
    {props.value}
    </div>
  );
}

class Empathic extends React.Component {
  constructor(props) {
    super(props);
//    this.api = 'http://192.168.1.7/api'
    this.api = 'http://127.0.0.1:5000/api'
    this.size = 96;
    this.state = {
      width: 0,
      height: 0,
      heatmap: this.newHeatmap(),
      pressing: false,
      pressX: 0,
      pressY: 0,
    };
  }

  componentDidMount() {
    this.session = uuid.v4();
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions.bind(this));
    this.updateHeatmap();
  //  this.timer = setInterval(() => this.updateHeatmap(), 10000);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
    this.timer = null;
    window.removeEventListener('resize', this.updateWindowDimensions.bind(this));
  }

  updateWindowDimensions() {
    this.setState({width: window.innerWidth, height: window.innerHeight});
  }

  newHeatmap() {
    return Array(this.size * this.size).fill(0);
  }

  updateHeatmap() {
    fetch(this.api + '/heat', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then((response) => response.json())
    .then((responseJson) => {
      const heatmap = this.newHeatmap();
      responseJson.forEach(function(element) {
        let res = element.split(",");
        let x = parseFloat(res[0]);
        let y = parseFloat(res[1]);
        let w = parseFloat(res[2]);
        let ix = Math.round(x * this.size);
        let iy = Math.round(y * this.size);
        heatmap[this.index(ix, iy)] = w;
      }.bind(this));
      this.setState({heatmap: heatmap});
    })
    .catch((error) => {
      console.error(error);
    });
  }

  index(ix, iy) {
    return iy * this.size + ix;
  }

  handlePress(e) {
    persist(e);
    console.log("handlePress x =", e.clientX, " y =", e.clientY);
    this.setState({pressX: e.clientX, pressY: e.clientY, pressing: true}, () => {
      fetch(this.api + '/press', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: serialize({
          s: this.session,
          x: this.state.pressX / this.state.width,
          y: this.state.pressY / this.state.height,
        }),
      })
      .then((response) => {
        if (response.status !== 200) {
          return;
        }
        this.updateHeatmap();
      })
      .catch((error) => {
        console.error(error);
      });
    });
  }

  handleRelease() {
    console.log("handleRelease");
    this.setState({pressX: 0, pressY: 0, pressing: false}, () => {
      fetch(this.api + '/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: serialize({
          s: this.session,
        }),
      })
      .then((response) => {
        if (response.status !== 200) {
          return;
        }
        this.updateHeatmap();
      })
      .catch((error) => {
        console.error(error);
      });
    });
  }

  handleTouchStart(e) {
    persist(e);
    console.log("handleTouchStart");
    this.handlePress(e.touches[0]);
  }

  handleTouchEnd() {
    console.log("handleTouchEnd");
    this.handleRelease();
  }

  renderCircle() {
    let ix = Math.round(this.state.pressX / this.state.width * this.size);
    let iy = Math.round(this.state.pressY / this.state.height * this.size);
    let alpha = this.state.heatmap[this.index(ix, iy)];
    if (alpha < 0.1) {
      alpha = 0.1;
    }
    let color = 'rgba(255, 0, 0, ' + alpha + ')';
    let left = (this.state.pressX - 30) + "px";
    let top = (this.state.pressY - 30) + "px";
    console.log("renderCircle:", color, left, top);
    return (
      <div>
      <span className="dot" style={{position: "fixed", backgroundColor: color, left: left, top: top}}></span>
      </div>
    );
  }

  render() {
    let circle = this.state.pressing ? this.renderCircle() : null;
    return (
      <Square
        value={circle}
        onPress={this.handlePress.bind(this)}
        onRelease={this.handleRelease.bind(this)}
        onTouchStart={this.handleTouchStart.bind(this)}
        onTouchEnd={this.handleTouchEnd.bind(this)}
        width={this.state.width}
        height={this.state.height}
        key="Square"
      />
    );
  }
}

// ========================================

ReactDOM.render(
  <Empathic />,
  document.getElementById('root')
);

function serialize(obj) {
  var str = [];
  for (var p in obj) {
    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  }
  return str.join("&");
}

function persist(e) {
  if (typeof e.persist === 'function') {
    e.persist();
  }
}
