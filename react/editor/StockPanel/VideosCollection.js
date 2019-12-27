import React, { useRef, useState, useEffect } from "react";
import {
  SearchBar,
  VideosContainer,
  SearchInput,
  VideosHeader,
  VideosBackContainer,
  MainContainer,
  VideoResult
} from "./styles";
import Icon from "../../_core/Icon";
import { StockCard } from "./StockCard";
import { VideoDetailsDialog } from "../../_core/Dialog";
import PerfectScroller from "react-perfect-scrollbar";

const VideosCollection = props => {
  const asset = [
    {
      url: "https://s3.amazonaws.com/virginia-testing.webrand.com/public/stryb_v3913895.mp4"
    },
    {
      url: "https://s3.amazonaws.com/virginia-testing.webrand.com/public/stryb_v4020131.mp4"
    }
  ];
  const [isModal, setModal] = useState(false);
  const [data, setData] = useState(null);

  return (
    <VideosContainer>
      <SearchBar>
        <Icon style={{ margin: "0 18px" }} color="#665dc3" name="search" />
        <SearchInput placeholder="Search video.." />
      </SearchBar>
      <VideoDetailsDialog
        data={data}
        closeModal={() => setModal(false)}
        open={isModal}
      />
      <VideosHeader>
        <VideosBackContainer onClick={() => props.history.goBack()}>
          <Icon
            name="arrowLeft"
            style={{ marginRight: 6, transform: "rotate(90deg)" }}
          />
          <span>Back to collections</span>
        </VideosBackContainer>
        <h2
          style={{
            fontSize: "1.625rem",
            fontWeight: 600,
            textAlign: "center",
            color: "#fff",
            flex: 1,
            textTransform: "capitalize"
          }}
        >
          {props?.match?.params?.key?.replace(/-/gi, " ")}
        </h2>
      </VideosHeader>
      <MainContainer>
        <PerfectScroller component="div">
          <VideoResult>
            {asset.map((val, key) => {
              return (
                <StockCard
                  setModal={data => {
                    setData(data);
                    setModal(true);
                  }}
                  url={val.url}
                  key={key}
                />
              );
            })}
          </VideoResult>
        </PerfectScroller>
      </MainContainer>
    </VideosContainer>
  );
};

export default VideosCollection;
