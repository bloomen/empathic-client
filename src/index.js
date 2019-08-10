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
    this.nrow = 16;
    this.ncol = 10;
    this.session = 42;
    this.state = {
      weights: Array(this.nrow * this.ncol).fill(0),
    };
    this.updateWeights();
  }

  updateWeights() {
    fetch(this.api + '/heat', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })    
    .then((response) => response.json())
    .then((responseJson) => {
      const weights = this.state.weights.slice();
      const nrow = this.nrow;
      const ncol = this.ncol;
      responseJson.forEach(function(element) {
        console.log(element);
        let res = element.split(",");
        let x = parseFloat(res[0]);
        let y = parseFloat(res[1]);
        let w = parseFloat(res[2]);
        let ix = Math.floor(ncol * x);
        let iy = Math.floor(nrow * y);
        weights[iy * ncol + ix] = w;
      });
      this.setState({weights: weights});
    })
    .catch((error) => {
      console.error(error);
    });
  }

  handleClick(i) {
    this.updateWeights();

  }

  renderSquare(i) {
    let alpha = this.state.weights[i];
    let color = 'rgba(255, 0, 0, ' + alpha + ')';
    let circle = (
      <div>
      <span className="dot" style={{backgroundColor: color}}></span>
      </div>
    )
    return (
      <Square
        value={circle}
        onClick={() => this.handleClick(i)}
        key={i}
      />
    );
  }

  renderRow(irow) {
    const cols = []
    for (let i=0; i<this.ncol; i++) {
      cols.push(this.renderSquare(irow * this.ncol + i));
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
