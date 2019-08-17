import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function Square(props) {
  return (
    <div className="square" 
      onMouseDown={props.onPress} 
      onMouseUp={props.onRelease} 
      onMouseMove={props.onMove}
      onTouchStart={props.onTouchStart}
      onTouchEnd={props.onTouchEnd}
      onTouchMove={props.onTouchMove}
      style={{position: "fixed", left: 0, top: 0, width: props.width, height: props.height}}
    >
    {props.value}
    </div>
  );
}

class Empathic extends React.Component {
  constructor(props) {
    super(props);
    this.api = 'http://192.168.1.7/api'
//    this.api = 'http://127.0.0.1:5000/api'
    this.nrow = 16;
    this.ncol = 10;
    this.session = 42;
    this.state = {
      width: 0,
      height: 0,
      heatmap: this.newHeatmap(),
      pressing: false,
      pressX: 0,
      pressY: 0,
    };
    this.updateHeatmap();
  }

  componentDidMount() {
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions.bind(this));
  }

  updateWindowDimensions() {
    this.setState({ width: window.innerWidth, height: window.innerHeight });
  }

  newHeatmap() {
    return Array(this.nrow * this.ncol).fill(0);
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
      const nrow = this.nrow;
      const ncol = this.ncol;
      responseJson.forEach(function(element) {
        console.log(element);
        let res = element.split(",");
        let x = parseFloat(res[0]);
        let y = parseFloat(res[1]);
        let w = parseFloat(res[2]);
        let ix = Math.round(ncol * x);
        let iy = Math.round(nrow * y);
        heatmap[iy * ncol + ix] = w;
      });
      this.setState({heatmap: heatmap});
    })
    .catch((error) => {
      console.error(error);
    });
  }

  handlePress(e) {
    console.log("handlePress");
    this.setState({pressX: e.clientX, pressY: e.clientY, pressing: true});
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
  }

  handleRelease() {
    console.log("handleRelease");
    this.setState({pressX: 0, pressY: 0, pressing: false});
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
  }

  handleMove(e) {
    if (!this.state.pressing) {
      return;
    }
    console.log("handleMove");
    this.setState({pressX: e.clientX, pressY: e.clientY});
  }

  handleTouchStart(e) {
    console.log("handleTouchStart");
    this.handlePress(e.touches[0]);
  }

  handleTouchEnd() {
    console.log("handleTouchEnd");
    this.handleRelease();
  }

  handleTouchMove(e) {
    console.log("handleTouchMove");
    this.handleMove(e.touches[0]);
  }

  renderCircle() {
    let i = Math.round(this.state.pressX / this.state.width * this.ncol);
    let j = Math.round(this.state.pressY / this.state.height * this.nrow);
    let index = i * this.ncol + j;
    let alpha = this.state.heatmap[index];
    //let alpha = 0.7;
    let color = 'rgba(255, 0, 0, ' + alpha + ')';
    let left = (this.state.pressX - 30) + "px";
    let top = (this.state.pressY - 30) + "px";
    console.log(color, left, top);
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
        onMove={this.handleMove.bind(this)}
        onTouchStart={this.handleTouchStart.bind(this)}
        onTouchEnd={this.handleTouchEnd.bind(this)}
        onTouchMove={this.handleTouchMove.bind(this)}
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
