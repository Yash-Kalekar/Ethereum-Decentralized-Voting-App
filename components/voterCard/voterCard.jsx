import React from "react";
import Image from "next/image";

//INTERNAL IMPORT

import Style from '../card/card.module.css';
import images from '../../assets';
import voterCardStyle from './voterCard.module.css';

const voterCard = ({voterArray}) => {
  return (
    <div className={Style.card}>
      {voterArray.map((el,i) =>(
        <div className={Style.card_box}>
          <div className={Style.image}>
            <img src={el[4]} alt="Profile Photo" />
          </div>
          <div className={Style.card_info}>
            <h2>
              {el[1]} #{el[0].toNumber()}
            </h2>
            <p>Address: {el[3].slice(0, 30)}...</p>
            <p>Details</p>
            <p className={voterCardStyle.vote_Status}>
              {el[6] == true ? "You Already Voted" : "Not Voted"}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
};

export default voterCard;
