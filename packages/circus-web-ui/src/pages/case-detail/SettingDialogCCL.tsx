import { Button, Modal } from 'components/react-bootstrap';
import React, { useState } from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';

const maximumCCNumOptions = {
  1: '1 CC',
  2: '2 CCs',
  3: '3 CCs',
  4: '4 CCs',
  5: '5 CCs',
  6: '6 CCs',
  7: '7 CCs',
  8: '8 CCs',
  9: '9 CCs',
  10: '10 CCs'
};
const neighborsOptions = {
  6: '6-neigobors',
  26: '26-neigobors'
};

const SettingDialogCCL: React.FC<{
  onHide: () => void;
  onOkClick: (dispLabelNumber: number, neighbors: 6 | 26) => void;
}> = React.memo(props => {
  const { onHide, onOkClick } = props;
  const [neighbor6, setNeighbor6] = useState(false);
  const [dispLabelNumber, setDispLabelNumber] = useState(2);
  return (
    <>
      <Modal.Header>
        <Modal.Title>
          Setting options for connected component labeling (CCL)
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          Maximum number of connected components (CCs) to display: &ensp;
          <ShrinkSelect
            bsSize="sm"
            options={maximumCCNumOptions}
            numericalValue
            value={dispLabelNumber}
            onChange={(value: number) => setDispLabelNumber(value)}
          />
        </div>
        <div>
          Neighbors to decide same CC: &ensp;
          <ShrinkSelect
            bsSize="sm"
            options={neighborsOptions}
            numericalValue
            value={neighbor6 ? 6 : 26}
            onChange={(value: number) => setNeighbor6(value == 6)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onHide()}>
          Cancel
        </Button>
        <Button
          onClick={() => onOkClick(dispLabelNumber, neighbor6 ? 6 : 26)}
          bsStyle="primary"
        >
          OK
        </Button>
      </Modal.Footer>
    </>
  );
});

export default SettingDialogCCL;
