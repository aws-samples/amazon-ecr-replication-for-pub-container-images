#!/bin/bash
# set -x

AccountID=$(aws sts get-caller-identity | jq -r ".Account")
ECR_DN="${AccountID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com.cn"

declare -A DOMAIN_MAP
DOMAIN_MAP["quayio"]="quay"
DOMAIN_MAP["quay.io"]="quay"
DOMAIN_MAP["gcr.io"]="gcr"
DOMAIN_MAP["asia.gcr.io"]="gcr"
DOMAIN_MAP["us.gcr.io"]="gcr"
DOMAIN_MAP["k8s.gcr.io"]="gcr/google_containers"
DOMAIN_MAP["docker.io"]="dockerhub"

function replaceDomainName(){
  math_mirror=False
  URI="$1"
  for key in ${!DOMAIN_MAP[*]};do
    if [[ $URI == ${key}* ]]; then
	  math_mirror=True
	  URI=${URI/#${key}/${DOMAIN_MAP[$key]}}
	  break
    fi
  done
  if [[ $math_mirror == False ]] ; then
    URI="dockerhub/${URI}"
  fi
}

function createEcrRepo() {
  if inArray "$1" "$allEcrRepos"
  then
    echo "repo: $1 already exists"
  else
    echo "creating repo: $1"
    aws ecr create-repository --repository-name "$1"    
  fi
}

function deleteEcrRepo() {
  if inArray "$1" "$allEcrRepos"
  then
    echo "deleting repo: $1"
    aws ecr delete-repository --repository-name "$1" --force
  fi
}

function isRemoteImageExists(){
  # is_remote_image_exists repositoryName:Tag Digests
  fullrepo=${1#*/}
  repoName=${fullrepo%%:*}
  tag=${fullrepo##*:}
  res=$(aws ecr describe-images --repository-name "$repoName" --query "imageDetails[?(@.imageDigest=='$2')].contains(@.imageTags, '$tag') | [0]")

  if [ "$res" == "true" ]; then 
    return 0 
  else
    return 1
  fi
}

function getLocalImageDigests(){
  x=$(docker image inspect --format='{{index .RepoDigests 0}}' "$1")
  echo ${x##*@}
  # docker images --digests --no-trunc -q "$1"
}

function inArray() {
    local list=$2
    local elem=$1  
    for i in ${list[@]}
    do
        if [ "$i" == "${elem}" ] ; then
            return 0
        fi
    done
    return 1    
}

function pullAndPush(){
  origimg="$1"
  echo "------origimg:${origimg}------"
  repo=`echo ${origimg}|cut -d: -f1`

  docker pull $origimg
  replaceDomainName $origimg
  targetImg="$ECR_DN/${URI}"
  echo "tagging $origimg to $targetImg"
  docker tag $origimg $targetImg
  docker push $targetImg
}

# list all existing repos
allEcrRepos=$(aws ecr describe-repositories --query 'repositories[*].repositoryName' --output text)
echo "allEcrRepos:$allEcrRepos"

# ecr login for the once
$(aws ecr get-login --no-include-email)

IMAGES_FILE_LIST='images.txt'

repos=$(grep -v ^# $IMAGES_FILE_LIST | cut -d: -f1 | sort -u)
for repo in ${repos[@]}
do
  replaceDomainName $repo
  createEcrRepo $URI $repo
done

images=$(grep -v ^# $IMAGES_FILE_LIST)
for image in ${images[@]}
do
  pullAndPush $image
done