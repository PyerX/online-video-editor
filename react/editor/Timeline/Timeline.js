/**
 * @file Timeline.js
 * @author Ervis Semanaj
 */

import React, { Component } from "react";
import PropTypes from "prop-types";
import vis from "../../_lib/vis-timeline/vis"; //Customized vis-timeline

import { server } from "../../../config";
import timeManager from "../../../models/timeManager";

import Editor from "../Editor";
import AddFilterDialog from "./AddFilterDialog";
import moment from "moment";
import { extendMoment } from "moment-range";
import { formattedDateFromString } from "../../utils";
import AlertErrorDialog from "../../_core/Dialog/Dialogs/AlertErroDialog";
const Moment = extendMoment(moment);
import { TimelineHeader } from "../style";

export default class Timeline extends Component {
  constructor(props) {
    super(props);

    this.timeline = null;

    this.state = {
      selectedItems: [],
      showAddFilterDialog: false,
      duration: "00:00:00,000",
      timePointer: "00:00:00,000",
      error: false,
      position: null
    };

    this.onSelect = this.onSelect.bind(this);
    this.onMoving = this.onMoving.bind(this);
    this.onMove = this.onMove.bind(this);
    this.buttonFilter = this.buttonFilter.bind(this);
    this.buttonSplit = this.buttonSplit.bind(this);
    this.buttonDel = this.buttonDel.bind(this);
    this.closeAddFilterDialog = this.closeAddFilterDialog.bind(this);
    this.getItem = this.getItem.bind(this);
    this.addTrack = this.addTrack.bind(this);
    this.delTrack = this.delTrack.bind(this);
  }

  componentDidMount() {
    const container = document.getElementById("vis-timeline");
    const options = {
      orientation: "top",
      min: new Date(1970, 0, 1),
      max: new Date(1970, 0, 1, 23, 59, 59, 999),
      showCurrentTime: true,
      start: new Date(1970, 0, 1),
      end: new Date(1970, 0, 1, 0, 0, 10, 0),
      multiselect: false,
      multiselectPerGroup: false,
      stack: false,
      zoomMin: 1000 * 80,
      editable: {
        overrideItems: false,
        add: true,
        updateTime: true,
        updateGroup: true,
        remove: false
      },
      itemsAlwaysDraggable: {
        item: true,
        range: true
      },
      zoomMax: 315360000000000,
      onRemove: this.onRemove,
      onMove: this.onMove,
      zoomable: false,
      zoomKey: "ctrlKey",
      horizontalScroll: true,
      onMoving: this.onMoving,
      onAdd: item => {
        console.log("aaa",this.timeline.itemsData.get())
        if (item?.group?.includes(item?.support)) {
          let startDate = item?.start;
          let length = this.props?.resources[item?.content]?.length
            ? this.props?.resources[item?.content]?.length
            : moment(startDate)
                .add(3, "s")
                .format("HH:mm:ss,SSS");
          length =
            item?.support === "text"
              ? moment(startDate)
                  .add(5, "s")
                  .format("HH:mm:ss,SSS")
              : length;
          this.props.items
            .filter(val => val.id === item?.group)?.[0]
            ?.items?.map(data => {
              const start = formattedDateFromString(data.in);
              const end = formattedDateFromString(data.out);
              // const range = moment.range(moment(start), moment(end));
              const duration = timeManager.addDuration(
                moment(startDate).format("HH:mm:ss,SSS"),
                length
              );
              let currentRange = moment.range(
                startDate,
                formattedDateFromString(duration)
              );
              if (currentRange.contains(start) || currentRange.contains(end)) {
                startDate = moment(formattedDateFromString(data.out)).add(
                  2,
                  "s"
                );
              }
              // if (
              //   range.contains(formattedDateFromString(duration)) ||
              //   range.contains(startDate)
              // ) {
              //   startDate = moment(formattedDateFromString(data.out)).add(2, "s");
              // }
            });
          this.onInsert(
            item?.content,
            startDate,
            item?.support,
            item?.group,
            length
          );
        } else {
          this.setState({
            error: `can't drag on ${item?.group}`
          });
        }
      },
      onDropObjectOnItem: (objectData, item, callback) => {},
      timeAxis: {
        scale: "second",
        step: 2
      },
      format: {
        minorLabels: {
          millisecond: "SSS [ms]",
          second: "s [s]",
          minute: "HH:mm:ss",
          hour: "HH:mm:ss",
          weekday: "HH:mm:ss",
          day: "HH:mm:ss",
          week: "HH:mm:ss",
          month: "HH:mm:ss",
          year: "HH:mm:ss"
        },
        majorLabels: {
          millisecond: "HH:mm:ss",
          second: "HH:mm:ss",
          minute: "",
          hour: "",
          weekday: "",
          day: "",
          week: "",
          month: "",
          year: ""
        }
      }
    };
    this.timeline = new vis.Timeline(container, [], [], options);
    this.timeline.addCustomTime(new Date(1970, 0, 1));
    this.timeline.setCustomTimeTitle("00:00:00,000");
    this.timeline.on("select", this.onSelect);
    this.timeline.on("timechange", this.onTimeChange);
    this.timeline.on("moving", this.onMoving);
    this.timeline.on("move", this.onMove);
    this.timeline.on("mouseDown", event => {
      this.setState({
        position: {
          x: event.pageX,
          y: event.pageY
        }
      });
    });
    this.timeline.on("mouseUp", event => {
      if (
        this.state?.position?.x === event.pageX &&
        this.state?.position?.y === event.pageY
      ) {
        this.onClickTimeline(event);
      } else {
        return null;
      }
    });
    container.addEventListener("DOMNodeInserted", () => {
      if (
        !document.querySelector(".customize-bar") &&
        document.querySelector(".vis-custom-time ")
      ) {
        const element = document.createElement("div");
        element.setAttribute("class", "customize-bar");
        container.removeEventListener("DOMNodeInserted", null);
        document.querySelector(".vis-custom-time ").appendChild(element);
      }
    });
    this.timeline.fit();
  }
  onClickTimeline = event => {
    if (this.state.movingTimline) {
      this.setState({
        movingTimline: false
      });
    }
    if (!event?.item && !this.state.movingTimline) {
      let date = new Date(
        1970,
        0,
        1,
        event?.time.getHours(),
        event?.time.getMinutes(),
        event?.time.getSeconds(),
        event?.time.getMilliseconds()
      );
      this.timeline.setCustomTime(date);
      this.setState({ timePointer: Timeline.dateToString(date) });
    }
  };
  onRemove = (item = {}) => {
    const itemPath =
      item?.id?.split(":") || this.state.selectedItems?.[0]?.split(":");
    let track = Editor.findTrack(this.props.items, itemPath[0]);
    let data = Editor.findItem(track, Number(itemPath[1]));
    const url = `${server.apiUrl}/project/${this.props.project}/item`;
    const params = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        track: itemPath[0],
        item: data?.item?.id
      })
    };
    fetch(url, params)
      .then(response => response.json())
      .then(data => {
        if (typeof data.err !== "undefined") {
          alert(`${data.err}\n\n${data.msg}`);
        }
        this.props.loadData();
      })
      .catch(error => this.props.fetchError(error.message));
  };

  onInsert = (id, startTime, support, group, length) => {
    // Send request to API
    let url = "";
    let params = "";
    if (support === "text") {
      url = `${server.apiUrl}/project/${this.props.project}/textanimation`;
      params = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          track: group,
          textAnimation: id,
          in: moment(startTime).format("HH:mm:ss,SSS"),
          out: this.props.resources[id]?.length
            ? timeManager.addDuration(
                moment(startTime).format("HH:mm:ss,SSS"),
                this.props.resources[id]?.length
              )
            : length
        })
      };
    } else {
      url = `${server.apiUrl}/project/${this.props.project}/file/${id}`;
      params = {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          track: group,
          support: support,
          in: moment(startTime).format("HH:mm:ss,SSS"),
          out: this.props.resources[id]?.length
            ? timeManager.addDuration(
                moment(startTime).format("HH:mm:ss,SSS"),
                this.props.resources[id]?.length
              )
            : length
        })
      };
    }

    fetch(url, params)
      .then(response => response.json())
      .then(data => {
        if (typeof data.err === "undefined") {
          this.props.loadData();
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch(error => this.props.fetchError(error.message));
  };

  getIcons = text => {
    switch (text) {
      case "texttrack0":
        return "text_fields";
      case "audiotrack0":
        return "audiotrack";
      case "videotrack0":
        return "videocam";
      default:
        return "videocam";
    }
  };

  componentDidUpdate(prevProps) {
    if (prevProps.items === this.props.items) return;

    const groups = [];
    const items = new vis.DataSet([]);

    let duration = "00:00:00,000";
    const tracks = [...this.props.items];
    const videoMatch = new RegExp(/^videotrack\d+/);
    const textMatch = new RegExp(/^texttrack\d+/);
    for (let track of tracks) {
      let isVideo = videoMatch.test(track.id);
      groups.push({
        id: track.id,
        content: `<div style="height: ${
          isVideo ? "60px" : "40px"
        }; align-items: center;display: flex; justify-content: center; border-bottom: none; text-transform: capitalize">
        <i class="material-icons" aria-hidden="true">${this.getIcons(
          track.id
        )}</i></div>`,
        className: "timeline-group"
      });

      let actualTime = "00:00:00,000";
      let index = 0;

      for (let item of track.items) {
        if (item?.resource === "blank") {
          actualTime = timeManager.addDuration(item.length, actualTime);
        } else {
          const timeIn = actualTime.match(/^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/);
          actualTime = timeManager.addDuration(actualTime, item.out);
          actualTime = timeManager.subDuration(actualTime, item.in);
          const timeOut = actualTime.match(
            /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/
          );
          let content =
            this.props.resources?.[item?.resource_id]?.name ||
            item?.textAnimation;
          if (item?.filters?.length > 0)
            content =
              '<div class="filter"></div><i class="filter material-icons">flare</i>' +
              content;
          // todo Subtract transition duration
          // let endTime = item?.out?.split(/:|,/);
          // let startTime = item?.in?.split(/:|,/);
          items.update({
            id: track.id + ":" + index,
            content: content,
            align: "center",
            start: formattedDateFromString(item?.in),
            end: formattedDateFromString(item?.out),
            group: track.id,
            className: videoMatch.test(track.id)
              ? "video"
              : !!textMatch.test(track.id)
              ? "text"
              : "audio"
          });
          index++;
        }
      }
      if (actualTime > duration) {
        duration = actualTime;
      }
    }

    if (this.state.duration !== duration) this.setState({ duration: duration });

    this.timeline.setData({
      items: items,
      groups: groups
    });

    // this.timeline.fit();
  }

  onFitScreen = () => {
    this.timeline.fit();
  };

  onZoomIn = () => {
    this.timeline.zoomIn(1);
  };

  onZoomOut = () => {
    this.timeline.zoomOut(0.1);
  };

  render() {
    return (
      <div
        style={{ zIndex: 10000 }}
        onDragOver={event => {
          event.stopPropagation();
          event.preventDefault();
        }}
      >
        {!!this.state.error && (
          <AlertErrorDialog
            onClose={() =>
              this.setState({
                error: false
              })
            }
            msg={this.state.error}
          />
        )}
        <TimelineHeader>
          <div>
            <button onClick={this.buttonSplit}>
              <i className="material-icons" aria-hidden="true">
                flip
              </i>
              Split in point
            </button>
            {/*<button><i className="material-icons" aria-hidden="true">menu</i>Vlastnosti</button>*/}
            <button onClick={this.onRemove}>
              <i className="material-icons" aria-hidden="true">
                remove
              </i>
              Remove
            </button>
          </div>
          <div id="time">
            {this.state.timePointer} / {this.state.duration}
          </div>
          <div>
            <button onClick={this.onZoomIn}>
              <i className="material-icons" aria-hidden="true">
                zoom_in
              </i>
              Zoom in
            </button>
            <button onClick={this.onZoomOut}>
              <i className="material-icons" aria-hidden="true">
                zoom_out
              </i>
              Zoom out
            </button>
            <button onClick={this.onFitScreen}>
              <i className="material-icons" aria-hidden="true">
                remove
              </i>
              Fit To Screen
            </button>
          </div>
        </TimelineHeader>
        {/*<button><i className="material-icons" aria-hidden="true">photo_filter</i>Přidat přechod</button>*/}
        <div id="vis-timeline" />
        {this.state.showAddFilterDialog && (
          <AddFilterDialog
            item={this.state.selectedItems[0]}
            getItem={this.getItem}
            project={this.props.project}
            onClose={this.closeAddFilterDialog}
            onAdd={filter => this.props.onAddFilter(filter)}
            onDel={filter => this.props.onDelFilter(filter)}
            fetchError={this.props.fetchError}
          />
        )}
      </div>
    );
  }

  onSelect(properties) {
    this.setState({ selectedItems: properties.items });
  }

  buttonFilter() {
    if (this.state.selectedItems.length === 0) return;

    this.setState({ showAddFilterDialog: true });
  }

  closeAddFilterDialog() {
    this.setState({ showAddFilterDialog: false });
  }

  buttonSplit() {
    if (this.state.selectedItems.length !== 1) return;

    const item = this.getItem(this.state.selectedItems[0]);
    const splitTime = Timeline.dateToString(this.timeline.getCustomTime());
    const splitItemTime = timeManager.subDuration(splitTime, item.start);
    if (splitTime <= item.item.in || splitTime >= item.item.out) return;

    const itemPath = this.state.selectedItems[0].split(":");
    const url = `${server.apiUrl}/project/${this.props.project}/item/split`;
    const params = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        track: itemPath[0],
        item: item.item.id,
        time: splitItemTime
      })
    };

    fetch(url, params)
      .then(response => response.json())
      .then(data => {
        if (typeof data.err === "undefined") {
          this.props.loadData();
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch(error => this.props.fetchError(error.message));
  }

  buttonDel() {
    if (this.state.selectedItems.length !== 1) return;

    const itemPath = this.state.selectedItems[0].split(":");
    const url = `${server.apiUrl}/project/${this.props.project}/item`;
    const params = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        track: itemPath[0],
        item: Number(itemPath[1])
      })
    };

    fetch(url, params)
      .then(response => response.json())
      .then(data => {
        if (typeof data.err === "undefined") {
          const track = Editor.findTrack(this.props.items, itemPath[0]);
          if (Editor.findItem(track.items, 1) === null)
            this.delTrack(itemPath[0]);
          else this.props.loadData();

          this.setState({ selectedItems: [] });
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch(error => this.props.fetchError(error.message));
  }

  getItem(trackIndex) {
    const itemPath = trackIndex.split(":");
    const trackItems = Editor.findTrack(this.props.items, itemPath[0]);
    return Editor.findItem(trackItems, Number(itemPath[1]));
  }

  getItemInRange(timelineID, itemID, start, end) {
    const track = Editor.findTrack(this.props.items, timelineID);
    const items = [];
    let time = "00:00:00,000";
    let index = 0;
    for (let item of track) {
      if (item.resource === "blank") {
        time = timeManager.addDuration(item.length, time);
      } else {
        if (end <= time) break;
        const timeStart = time;
        time = timeManager.addDuration(time, item.out);
        time = timeManager.subDuration(time, item.in);
        // todo Subtract transition duration
        if (index++ === itemID) continue; // Same item
        if (start >= time) continue;
        items.push({
          start: timeStart,
          end: time
        });
      }
    }
    return items;
  }

  onTimeChange = event => {
    const timePointer = Timeline;
    if (event.time.getFullYear() < 1970) {
      this.timeline.setCustomTime(new Date(1970, 0, 1));
      this.timeline.setCustomTimeTitle("00:00:00,000");
      this.setState({ timePointer: "00:00:00,000" });
    } else if (timePointer > this.state.duration) {
      let date = new Date(
        1970,
        0,
        1,
        event.time.getHours(),
        event.time.getMinutes(),
        event.time.getSeconds(),
        event.time.getMilliseconds()
      );
      this.timeline.setCustomTime(date);
      this.timeline.setCustomTimeTitle(Timeline.dateToString(date));
      this.setState({ timePointer: Timeline.dateToString(date) });
    } else {
      this.setState({ timePointer: timePointer });
      this.timeline.setCustomTimeTitle(timePointer);
    }
  };

  onMoving(item, callback) {
    const searchTrack = Editor.findTrack(
      this.props.items,
      item?.id?.split(":")?.[0]
    );
    let itemTrack = Editor.findItem(
      searchTrack,
      Number(item?.id?.split(":")?.[1])
    );
    const length = formattedDateFromString(
      timeManager.subDuration(itemTrack.item?.out, itemTrack.item?.in)
    );
    const subTime = formattedDateFromString(
      timeManager.subDuration(
        moment(item.end).format("HH:mm:ss,SSS"),
        moment(item.start).format("HH:mm:ss,SSS")
      )
    );
    const range = Moment.range(
      formattedDateFromString(itemTrack.item?.in),
      formattedDateFromString(itemTrack.item?.out)
    );
    if (length && subTime <= length) {
      this.setState(
        {
          isResize: subTime < length
        },
        () => {
          callback(this.itemMove(item));
        }
      );
    }
  }

  onMove(item) {
    item.className = "video";
    item = this.itemMove(item);
    if (item !== null) {
      if (!!this.state.isResize) {
        let track = Editor.findTrack(
          this.props.items,
          item?.id?.split(":")?.[0]
        );
        let itemTrack = Editor.findItem(
          track,
          Number(item?.id?.split(":")?.[1])
        );
        let direction =
          item.end < formattedDateFromString(itemTrack.item.out)
            ? "back"
            : "front";
        let time =
          item.end < formattedDateFromString(itemTrack.item.out)
            ? Timeline.dateToString(item.end)
            : Timeline.dateToString(item.start);
        const url = `${server.apiUrl}/project/${this.props.project}/item/crop`;
        const params = {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            track: item?.group,
            direction: direction,
            item: itemTrack?.item?.id,
            time: time
          })
        };

        fetch(url, params)
          .then(response => response.json())
          .then(data => {
            if (typeof data.err !== "undefined") {
              alert(`${data.err}\n\n${data.msg}`);
            } else {
              // Same track
              this.props.loadData();
            }
          })
          .catch(error => console.log(error.message));
        // if (item.end < formattedDateFromString(itemTrack.item.out)) {
        //   console.log("Backword");
        // } else if (item.start > formattedDateFromString(itemTrack.item.in)) {
        //   console.log("forwar");
        // }
      } else {
        const itemPath = item.id.split(":");
        const currentItem = Editor.findTrack(this.props.items, itemPath[0]);
        const url = `${server.apiUrl}/project/${this.props.project}/item/move`;
        const params = {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            track: itemPath[0],
            trackTarget: item.group,
            item: currentItem?.[0]?.id,
            time: Timeline.dateToString(item.start)
          })
        };

        fetch(url, params)
          .then(response => response.json())
          .then(data => {
            if (typeof data.err !== "undefined") {
              alert(`${data.err}\n\n${data.msg}`);
            } else {
              if (itemPath[0] === item?.group) {
                // Same track
                this.props.loadData();
              } else {
                // Moving between tracks
                const trackType = item.group.includes("audio")
                  ? "audio"
                  : "video";
                const prevTrack = Editor.findTrack(
                  this.props.items,
                  itemPath[0]
                )?.[0];
                const newTrack = Editor.findTrack(
                  this.props.items,
                  item.group
                )?.[0];
                const addTrack = newTrack?.items?.length === 0; //
                const delTrack = Editor.findItem(prevTrack, 1) === null;
                if (addTrack && delTrack)
                  this.addTrack(trackType, prevTrack.id);
                else if (addTrack) this.addTrack(trackType, null);
                else if (delTrack) this.delTrack(prevTrack.id);
                else this.props.loadData();
              }
            }
          })
          .catch(error => console.log(error.message));
      }
    }
  }

  itemMove = item => {
    if (item.start.getFullYear() < 1970) return null;
    // Deny move before zero time
    else {
      const itemPath = item.id.split(":");

      if (
        !(
          item.group.includes("videotrack") &&
          itemPath[0].includes("videotrack")
        )
      ) {
        if (
          !(
            item.group.includes("audiotrack") &&
            itemPath[0].includes("audiotrack")
          )
        ) {
          if (
            !(
              item.group.includes("texttrack") &&
              itemPath[0].includes("texttrack")
            )
          ) {
            return null;
          }
        }
      }

      item.className = item.className.includes("video") ? "video" : "audio";
      const itemIndex = itemPath[0] === item.group ? Number(itemPath[1]) : null;
      const start = Timeline.dateToString(item.start);
      const end = Timeline.dateToString(item.end);
      const collision = this.getItemInRange(item.group, itemIndex, start, end);
      if (collision.length === 0) {
        // Free
        return item;
      } else if (collision.length > 1) {
        // Not enough space
        return null;
      } else {
        // Space maybe available before/after item
        let itemStart = "";
        let itemEnd = "";
        const duration = timeManager.subDuration(end, start);
        if (
          timeManager.middleOfDuration(start, end) <
          timeManager.middleOfDuration(collision[0].start, collision[0].end)
        ) {
          // Put before
          item.className =
            item.className === "video"
              ? "video stick-right"
              : "audio stick-right";
          itemEnd = collision[0].start;
          const itemEndParsed = itemEnd.match(
            /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/
          );
          item.end = new Date(
            1970,
            0,
            1,
            itemEndParsed[1],
            itemEndParsed[2],
            itemEndParsed[3],
            itemEndParsed[4]
          );

          itemStart = timeManager.subDuration(collision[0].start, duration);
          const itemStartParsed = itemStart.match(
            /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/
          );
          if (itemStartParsed === null) return null; // Not enough space at begining of timeline
          item.start = new Date(
            1970,
            0,
            1,
            itemStartParsed[1],
            itemStartParsed[2],
            itemStartParsed[3],
            itemStartParsed[4]
          );
        } else {
          // Put after
          item.className =
            item.className === "video"
              ? "video stick-left"
              : "audio stick-left";
          itemStart = collision[0].end;
          const itemStartParsed = collision[0].end.match(
            /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/
          );
          item.start = new Date(
            1970,
            0,
            1,
            itemStartParsed[1],
            itemStartParsed[2],
            itemStartParsed[3],
            itemStartParsed[4]
          );

          itemEnd = timeManager.addDuration(collision[0].end, duration);
          const itemEndParsed = itemEnd.match(
            /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/
          );
          item.end = new Date(
            1970,
            0,
            1,
            itemEndParsed[1],
            itemEndParsed[2],
            itemEndParsed[3],
            itemEndParsed[4]
          );
        }
        // Check if there is enough space
        if (
          this.getItemInRange(item.group, itemIndex, itemStart, itemEnd)
            .length === 0
        ) {
          return item;
        }
        return null;
      }
    }
  };

  addTrack(type, delTrack) {
    const url = `${server.apiUrl}/project/${this.props.project}/track`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: type
      })
    };

    fetch(url, params)
      .then(response => response.json())
      .then(data => {
        if (typeof data.err !== "undefined") {
          alert(`${data.err}\n\n${data.msg}`);
        }

        if (delTrack !== null) this.delTrack(delTrack);
        else this.props.loadData();
      })
      .catch(error => this.props.fetchError(error.message));
  }

  delTrack(trackId) {
    const url = `${server.apiUrl}/project/${this.props.project}/track`;
    const params = {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        track: trackId
      })
    };

    fetch(url, params)
      .then(response => response.json())
      .then(data => {
        if (typeof data.err !== "undefined") {
          alert(`${data.err}\n\n${data.msg}`);
        }
        this.props.loadData();
      })
      .catch(error => this.props.fetchError(error.message));
  }

  /**
   * Get duration format from Date object
   *
   * @param {Date} date
   * @return {string} Duration in format '00:00:00,000'
   */
  static dateToString(date) {
    let string = `${date.getHours()}:`;
    if (string.length < 3) string = "0" + string;

    string += `00${date.getMinutes()}:`.slice(-3);
    string += `00${date.getSeconds()},`.slice(-3);
    string += `${date.getMilliseconds()}000`.slice(0, 3);
    return string;
  }
}

Timeline.propTypes = {
  resources: PropTypes.object.isRequired,
  items: PropTypes.array.isRequired,
  project: PropTypes.string.isRequired,
  onAddFilter: PropTypes.func.isRequired,
  onDelFilter: PropTypes.func.isRequired,
  loadData: PropTypes.func.isRequired,
  fetchError: PropTypes.func.isRequired
};
