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
    this.debug = true;
    this.api = 'http://192.168.1.7/api';
//    this.api = 'http://127.0.0.1:5000/api';
    this.size = 32;
    this.pressRequests = {}; // {id: req}
    this.releaseRequests = {}; // {id: req}
    this.fetchingHeatmap = false;
    this.state = {
      width: 0,
      height: 0,
      heatmap: this.newHeatmap(),
      press: {}, // {id: {x: ?, y: ?}}
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
    this.setState({width: window.innerWidth, height: window.innerHeight}, () => {
      this.fetchHeatmap();
    });
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
    if (this.fetchingHeatmap) {
      return;
    }
    this.fetchingHeatmap = true;
    fetch(this.api + '/heat', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then(this.updateHeatmap.bind(this))
    .catch(console.error)
    .then(function() {
      this.fetchingHeatmap = false;
    }.bind(this));
  }

  index(ix, iy) {
    return iy * this.size + ix;
  }

  indexFromPixel(x, y) {
    let ix = Math.round(x / this.state.width * this.size);
    let iy = Math.round(y / this.state.height * this.size);
    return this.index(ix, iy);
  }

  handlePressImpl(id, e) {
    const press = copyObj(this.state.press);
    press[id] = {x: e.clientX, y: e.clientY};

    this.setState({press: press}, () => {
      if (!(id in this.state.press)) {
        return;
      }
      if (id in this.pressRequests) {
        return;
      }

      let pressReq = function() {
        console.log("2 press post id =", id);
        if (id in this.releaseRequests) {
          return;
        }
        console.log("press post id =", id);
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
        .catch(console.error)
        .then(function() {
          console.log("press finally id =", id);
          delete this.pressRequests[id];
          if (id in this.releaseRequests) {
            this.releaseRequests[id]();
          }
        }.bind(this));
      }.bind(this);

      this.pressRequests[id] = pressReq;

      if (!(id in this.releaseRequests)) {
        pressReq();
      }
    });
  }

  handlePress(id, e) {
    if (id in this.state.press) {
      return;
    }
    persist(e);
    console.log("handlePress id =", id, "x =", e.clientX, " y =", e.clientY);
    this.handlePressImpl(id, e);
  }

  handleMove(id, e) {
    if (!(id in this.state.press)) {
      return;
    }
    persist(e);

    this.handlePressImpl(id, e);
  }

  handleRelease(id) {
    if (!(id in this.state.press)) {
      return;
    }
    console.log("handleRelease id =", id);

    const press = copyObj(this.state.press);
    delete press[id];

    this.setState({press: press}, () => {
      if (id in this.releaseRequests) {
        return;
      }

      let releaseReq = function() {
        console.log("2 release post id =", id);
        if (id in this.pressRequests) {
          return;
        }
        console.log("release post id =", id);
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
        .catch(console.error)
        .then(function() {
          console.log("release finally id =", id);
          delete this.releaseRequests[id];
          if (id in this.pressRequests) {
            this.pressRequests[id]();
          }
        }.bind(this));
      }.bind(this);

      this.releaseRequests[id] = releaseReq;

      if (!(id in this.pressRequests)) {
        releaseReq();
      }
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

  renderCircle(id, x, y, w, size=70) {
    const color = 'rgba(255, 0, 0, ' + w + ')';
    const width = size;
    const height = width;
    const left = x - width / 1.4;
    const top = y - width;
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

  initialCircles() {
    let circles = []
    if (this.debug) {
      for (let ix = 0; ix < this.size; ix++) {
        for (let iy = 0; iy < this.size; iy++) {
          let index = this.index(ix, iy);
          if (this.state.heatmap[index] > 0) {
            let x = Math.round(ix / this.size * this.state.width);
            let y = Math.round(iy / this.size * this.state.height);
            let w = clamp(this.state.heatmap[this.indexFromPixel(x, y)], 0, 1);
            circles.push(this.renderCircle(1000 + index, x, y, w, 35));
          }
        }
      }
    }
    return circles;
  }

  render() {
    let circles = this.initialCircles();
    for (const id of Object.keys(this.state.press)) {
      let x = this.state.press[id].x;
      let y = this.state.press[id].y;
      let w = clamp(this.state.heatmap[this.indexFromPixel(x, y)], 0.1, 1);
      circles.push(this.renderCircle(id, x, y, w));
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// function removeFrom(array, value) {
//   var index = array.indexOf(value);
//   if (index > -1) {
//     return array.splice(index, 1);
//   }
//   return array;
// }
