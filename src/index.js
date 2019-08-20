import React from 'react';
import ReactDOM from 'react-dom';
import uuid from "uuid";
import './index.css';

function Square(props) {
  return (
    <div className="square" 
      onMouseDown={props.onPress}
      onMouseMove={props.onMove}
      onMouseUp={props.onRelease}
      onTouchStart={props.onTouchStart}
      onTouchMove={props.onTouchMove}
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
    this.api = 'http://192.168.1.7/api'
//    this.api = 'http://127.0.0.1:5000/api'
    this.size = 96;
    this.state = {
      width: 0,
      height: 0,
      heatmap: this.newHeatmap(),
      press: {},
    };
    document.title = "Empathic";
    window.oncontextmenu = () => { return false; }
  }

  componentDidMount() {
    this.session = uuid.v4();
    this.updateWindowDimensions();
    window.addEventListener('resize', this.updateWindowDimensions.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowDimensions.bind(this));
  }

  updateWindowDimensions() {
    this.setState({width: window.innerWidth, height: window.innerHeight});
  }

  makeSession(id) {
    return this.session + "-" + id;
  }

  newHeatmap() {
    return Array(this.size * this.size).fill(0);
  }

  updateHeatmap(response) {
    if (response.status !== 200) {
      return;
    }
    response.json().then(function(responseJson) {
      const heatmap = this.newHeatmap();
      for (const elem of responseJson) {
        let res = elem.split(",");
        let x = parseFloat(res[0]);
        let y = parseFloat(res[1]);
        let w = parseFloat(res[2]);
        let ix = Math.round(x * this.size);
        let iy = Math.round(y * this.size);
        heatmap[this.index(ix, iy)] = w;
      }
      this.setState({heatmap: heatmap});
    }.bind(this))
    .catch(console.error);
  }

  fetchHeatmap() {
    fetch(this.api + '/heat', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then(this.updateHeatmap.bind(this))
    .catch(console.error);
  }

  index(ix, iy) {
    return iy * this.size + ix;
  }

  handlePress(id, e) {
    if (id in this.state.press) {
      return;
    }
    persist(e);
    console.log("handlePress id =", id, "x =", e.clientX, " y =", e.clientY);

    const press = copyObj(this.state.press);
    press[id] = {x: e.clientX, y: e.clientY};

    this.setState({press: press}, () => {
      fetch(this.api + '/press', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: serialize({
          s: this.makeSession(id),
          x: this.state.press[id].x / this.state.width,
          y: this.state.press[id].y / this.state.height,
        }),
      })
      .then(this.updateHeatmap.bind(this))
      .catch(console.error);
    });
  }

  handleMove(id, e) {
    if (!(id in this.state.press)) {
      return;
    }
    persist(e);

    const press = copyObj(this.state.press);
    press[id] = {x: e.clientX, y: e.clientY};
    this.setState({press: press});
  }

  handleRelease(id) {
    if (!(id in this.state.press)) {
      return;
    }
    console.log("handleRelease id =", id);

    const press = copyObj(this.state.press);
    delete press[id];

    this.setState({press: press}, () => {
      fetch(this.api + '/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: serialize({
          s: this.makeSession(id),
        }),
      })
      .then(this.updateHeatmap.bind(this))
      .catch(console.error);
    });
  }

  handleTouchStart(e) {
    persist(e);
    console.log("handleTouchStart");
    for (let i = 0; i < e.changedTouches.length; i++) {
      const elem = e.changedTouches[i];
      this.handlePress(elem.identifier, elem);
    }
  }

  handleTouchMove(e) {
    persist(e);
    for (let i = 0; i < e.changedTouches.length; i++) {
      const elem = e.changedTouches[i];
      this.handleMove(elem.identifier, elem);
    }
  }

  handleTouchEnd(e) {
    persist(e);
    console.log("handleTouchEnd");
    for (let i = 0; i < e.changedTouches.length; i++) {
      const elem = e.changedTouches[i];
      this.handleRelease(elem.identifier);
    }
  }

  renderCircle(id) {
    let ix = Math.round(this.state.press[id].x / this.state.width * this.size);
    let iy = Math.round(this.state.press[id].y / this.state.height * this.size);
    let alpha = this.state.heatmap[this.index(ix, iy)];
    if (alpha < 0.1) {
      alpha = 0.1;
    }
    let color = 'rgba(255, 0, 0, ' + alpha + ')';
    let width = 70;
    let height = width;
    let left = this.state.press[id].x - width / 1.4;
    let top = this.state.press[id].y - width;
    return (
      <div key={id}>
      <span className="dot"
      style={{
        position: "fixed",
        backgroundColor: color,
        width: width + "pt",
        height: height + "pt",
        left: left + "px",
        top: top + "px"
      }}></span>
      </div>
    );
  }

  render() {
    let circles = []
    for (const id of Object.keys(this.state.press)) {
      circles.push(this.renderCircle(id));
    }
    return (
      <Square
        value={circles}
        onPress={function(e) { this.handlePress(-1, e); }.bind(this)}
        onMove={function(e) { this.handleMove(-1, e); }.bind(this)}
        onRelease={function(e) { this.handleRelease(-1, e); }.bind(this)}
        onTouchStart={this.handleTouchStart.bind(this)}
        onTouchMove={this.handleTouchMove.bind(this)}
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

function copyObj(obj) {
  return JSON.parse(JSON.stringify(obj));
}
