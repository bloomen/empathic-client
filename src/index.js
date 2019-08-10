import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function Square(props) {
  return (
    <button className="square" onClick={props.onClick}>
    {props.value}
    </button>
  );
}

class Board extends React.Component {
  constructor(props) {
    super(props);
    this.api = 'http://192.168.1.7/api'
//    this.api = 'http://127.0.0.1:5000/api'
    this.nrow = 16;
    this.ncol = 10;
    this.session = 42;
    this.state = {
      heatmap: Array(this.nrow * this.ncol).fill(0),
    };
    this.updateHeatmap();
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
      const heatmap = this.state.heatmap.slice();
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

  handleClick(i, j) {
    fetch(this.api + '/press', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: serialize({
        s: this.session,
        x: j / this.ncol,
        y: i / this.nrow,
      }),
    })
    .then((response) => {
      if (response.status === 200) {
        this.updateHeatmap();
      }
    })
    .catch((error) => {
      console.error(error);
    });
  }

  renderSquare(i, j) {
    let index = i * this.ncol + j;
    let alpha = this.state.heatmap[index];
    let color = 'rgba(255, 0, 0, ' + alpha + ')';
    let circle = (
      <div>
      <span className="dot" style={{backgroundColor: color}}></span>
      </div>
    )
    return (
      <Square
        value={circle}
        onClick={() => this.handleClick(i, j)}
        key={index}
      />
    );
  }

  renderRow(irow) {
    const cols = []
    for (let i=0; i<this.ncol; i++) {
      cols.push(this.renderSquare(irow, i));
    }    
    return (
      <div className="board-row" key={irow}>
      {cols}
      </div>      
    );
  }

  render() {
    const rows = []
    for (let i=0; i<this.nrow; i++) {
      rows.push(this.renderRow(i));
    }
    return (
      <div>
      {rows}
      </div>
    );
  }
}

class Game extends React.Component {
  render() {
    return (
      <div className="game">
        <div className="game-board">
          <Board />
        </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);

function serialize(obj) {
  var str = [];
  for(var p in obj)
     str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  return str.join("&");
}
